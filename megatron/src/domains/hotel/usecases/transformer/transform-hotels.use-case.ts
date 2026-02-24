import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { HotelApplication } from '../../applications/hotel.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('hotels')
export class TransformHotelsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly hotelApplication: HotelApplication,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }

  // code order in use cases -> important
  async execute(key: string | null, value: any): Promise<void> {
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r') {
      // this.logUseCaseEnd('hotels', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('hotels', key, value);

    if (!value) {
      this.logUseCaseEnd('hotels', false);
      return;
    }

    const outTopic = `${this.targetPrefix}hotels`;
    const outTopicContents = `${this.targetPrefix}content_hotels`;
    const outTopicSpots = `${this.targetPrefix}spot_hotels`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      await this.sendTombstone(outTopicContents, String(value.id));
      await this.sendTombstone(outTopicSpots, String(value.id));
      return;
    }

    let hotelData = value;

    // if the payload only has __op + id it means that amenity_hotel table have some changes,we will fetch full data from repo
    const keys = Object.keys(value);
    if (keys.length <= 2) { //&& keys.includes('__op') && keys.includes('id')) {
      try {
        hotelData = await this.hotelApplication.getHotelById(value.id);
        this.logger.debug(`Fetched hotel ${value.id} from repository`);
      } catch (err) {
        this.logger.error(`Failed to fetch hotel ${value.id}: ${err?.message ?? err}`);
        this.logUseCaseEnd('hotels', false);
        return;
      }
    }

    const transformed = await this.hotelApplication.transformHotelData(hotelData);
    let transformedForContents = null
    let transformedForSpots = null

    if (
      Number(hotelData?.state) !== 1 ||
      Number(hotelData?.status) !== 2 ||
      hotelData?.deleted_at != null ||
      Number(hotelData?.show_in_list) !== 1
    ) {
      await this.sendTombstone(outTopicContents, String(value.id));
    } else {
      transformedForContents = await this.hotelApplication.transformContentHotelData(hotelData);
    }

    if (!(Number(hotelData?.state) === 1 && Number(hotelData?.status) === 2 && hotelData?.deleted_at == null)) {
      await this.sendTombstone(outTopicSpots, String(value.id));
    } else {
      transformedForSpots = await this.hotelApplication.transformSpotHotelData(hotelData);
    }

    if (transformed) {
      await this.producer.sendMessage(outTopic, key, transformed);
      this.logUseCaseEnd('hotels', true, transformed);
    } else {
      this.logUseCaseEnd('hotels', false);
    }

    if (transformedForContents) {
      await this.producer.sendMessage(outTopicContents, key, transformedForContents);
      this.logUseCaseEnd('content_hotels', true, transformedForContents);
    } else {
      this.logUseCaseEnd('content_hotels', false);
    }

    if (transformedForSpots) {
      await this.producer.sendMessage(outTopicSpots, key, transformedForSpots);
      this.logUseCaseEnd('spot_hotels', true, transformedForSpots);
    } else {
      this.logUseCaseEnd('spot_hotels', false);
    }
  }
}
