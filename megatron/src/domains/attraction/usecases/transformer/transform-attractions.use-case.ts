import { Injectable } from '@nestjs/common';
import { KafkaProducerApplication } from '../../../../integration/event/drivers/kafka/kafka-producer.application';
import { ConfigService } from '@nestjs/config';
import { TopicHandler } from '../../../../integration/event/decorators/topic.decorator';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { AttractionApplication } from '../../applications/attraction.application';

@Injectable()
@TopicHandler('attractions')
export class TransformAttractionsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly attractionApplication: AttractionApplication,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }

  async execute(key: string | null, value: any): Promise<void> {
    if (!value) {
      this.logUseCaseEnd('attractions', false);
      return;
    }

    // ignore snapshot rows (Debezium)
    if (value?.__op === 'r') {
      // this.logUseCaseEnd('attractions', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('attractions', key, value);

    const outContentTopic = `${this.targetPrefix}content_attractions`;
    const outSpotTopic = `${this.targetPrefix}spot_attractions`;

    if (value?.__op === 'd') {
      await this.sendTombstone(outContentTopic, String(value.id));
      await this.sendTombstone(outSpotTopic, String(value.id));
      return;
    }

    // if the payload only has __op + id it means that amenity_hotel table have some changes,we will fetch full data from repo
    let payload = value;
    const keys = Object.keys(value);

    if (keys.length <= 2) { //&& keys.includes('__op') && keys.includes('id')) {
      try {
        payload = await this.attractionApplication.getAttractionById(payload.id);
        this.logger.debug(`Fetched attraction ${value.id} from repository`);
      } catch (err) {
        this.logger.error(`Failed to fetch attraction ${value.id}: ${err?.message ?? err}`);
        this.logUseCaseEnd('attractions', false);
        return;
      }
    }

    if (!payload) {
      this.logUseCaseEnd('attractions', false, { reason: 'not found' });
      return;
    }

    // delete on unpublished item
    if (Number(payload?.state) !== 1 || Number(payload?.status) !== 2 || payload?.deleted_at != null) {
      this.logger.debug(
        `Attraction filtered (state=${payload?.state}, status=${payload?.status}, deleted_at=${payload?.deleted_at})`,
      );
      await this.sendTombstone(outContentTopic, String(payload.id));
      await this.sendTombstone(outSpotTopic, String(payload.id));
      return;
    }

    const contentTransformed = await this.attractionApplication.transformContentAttractionData(payload);
    const spotTransformed = await this.attractionApplication.transformSpotAttractionData(payload);


    if (!contentTransformed || !spotTransformed) {
      this.logUseCaseEnd('attractions', false);
      return;
    }


    const msgKey = String(key ?? contentTransformed._id);
    await this.producer.sendMessage(outContentTopic, msgKey, contentTransformed);
    this.logUseCaseEnd('content_attractions', true, contentTransformed);

    await this.producer.sendMessage(outSpotTopic, msgKey, spotTransformed);
    this.logUseCaseEnd('spot_attractions', true, spotTransformed);
  }
}
