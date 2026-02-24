import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { LocationApplication } from '../../applications/location.application';

@Injectable()
@TopicHandler('locations')
export class TransformLocationsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly locationApplication: LocationApplication,
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
      // this.logUseCaseEnd('locations', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('locations', key, value);

    if (!value) {
      this.logUseCaseEnd('locations', false);
      return;
    }

    const contentOutTopic = `${this.targetPrefix}content_locations`;
    const spotOutTopic = `${this.targetPrefix}spot_locations`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    let locationData = value;
    // if the payload only has __op + id it means that amenity_hotel table have some changes,we will fetch full data from repo
    const keys = Object.keys(value);
    if (keys.length <= 2) { //&& keys.includes('__op') && keys.includes('id')) {
      try {
        locationData = await this.locationApplication.getLocationById(value.id);
        this.logger.debug(`Fetched location ${value.id} from repository`);
      } catch (err) {
        this.logger.error(`Failed to fetch location ${value.id}: ${err?.message ?? err}`);
        this.logUseCaseEnd('locations', false);
        return;
      }
    }

    if (locationData?.state !== 1 || locationData?.status !== 2 || locationData?.deleted_at != null) {
      await this.sendTombstone(contentOutTopic, String(locationData.id));
      await this.sendTombstone(spotOutTopic, String(locationData.id));
      return;
    }

    const transformedForContents = await this.locationApplication.transformContentLocationData(locationData);
    const transformedForSpots = await this.locationApplication.transformSpotLocationData(locationData);

    if (transformedForContents) {
      await this.producer.sendMessage(contentOutTopic, String(key ?? transformedForContents._id), transformedForContents);
      this.logUseCaseEnd('content_locations', true, transformedForContents);
    } else {
      this.logUseCaseEnd('content_locations', false);
    }

    if (transformedForSpots) {
      await this.producer.sendMessage(spotOutTopic, String(key ?? transformedForSpots._id), transformedForSpots);
      this.logUseCaseEnd('spot_locations', true, transformedForSpots);
    } else {
      this.logUseCaseEnd('spot_locations', false);
    }
  }
}
