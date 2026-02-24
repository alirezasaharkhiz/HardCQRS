import { Injectable } from '@nestjs/common';
import { KafkaProducerApplication } from '../../../../integration/event/drivers/kafka/kafka-producer.application';
import { ConfigService } from '@nestjs/config';
import { TopicHandler } from '../../../../integration/event/decorators/topic.decorator';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { AgencyApplication } from '../../applications/agency.application';

@Injectable()
@TopicHandler('agencies')
export class TransformAgenciesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly agencyApplication: AgencyApplication,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }

  async execute(key: string | null, value: any): Promise<void> {
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r') {
      // this.logUseCaseEnd('agencies', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('agencies', key, value);

    if (!value) {
      this.logUseCaseEnd('agencies', false);
      return;
    }

    const outTopic = `${this.targetPrefix}agencies`;
    const spotOutTopic = `${this.targetPrefix}spot_agencies`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    // if the payload only has __op + id it means that amenity_hotel table have some changes,we will fetch full data from repo
    let agency = value;
    const keys = Object.keys(value);
    if (keys.length <= 2) { //&& keys.includes('__op') && keys.includes('id')) {
      try {
        agency = await this.agencyApplication.getAgencyById(value.id);
        this.logger.debug(`Fetched agency ${value.id} from repository`);
      } catch (err) {
        this.logger.error(`Failed to fetch agency ${value.id}: ${err?.message ?? err}`);
        this.logUseCaseEnd('agencies', false);
        return;
      }
    }

    if (Number(agency?.state) !== 1 || agency?.deleted_at != null) {
      this.logger.debug('Agency not published (state/deleted_at mismatch)');
      await this.sendTombstone(outTopic, String(agency.id));
      await this.sendTombstone(spotOutTopic, String(agency.id));
      return;
    }

    const transformed = await this.agencyApplication.transformAgencyData(agency);

    if (transformed) {
      await this.producer.sendMessage(outTopic, key, transformed);
      this.logUseCaseEnd('agencies', true, transformed);

      await this.producer.sendMessage(spotOutTopic, key, transformed);
      this.logUseCaseEnd('spot_agencies', true, transformed);

    } else {
      this.logUseCaseEnd('agencies', false);
    }
  }
}
