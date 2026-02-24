import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { RestaurantApplication } from '../../applications/restaurant.application';

@Injectable()
@TopicHandler('restaurants')
export class TransformRestaurantsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly restaurantApplication: RestaurantApplication,
    producer: KafkaProducerApplication,
    config: ConfigService
  ) {
    super(producer, config);
  }

  async execute(key: string | null, value: any): Promise<void> {
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r'
    ) {
      // this.logUseCaseEnd('restaurants', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('restaurants', key, value);
    if (!value) {
      this.logUseCaseEnd('restaurants', false);
      return;
    }

    const outContentTopic = `${this.targetPrefix}content_restaurants`;
    const outSpotTopic = `${this.targetPrefix}spot_restaurants`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outContentTopic, String(value.id));
      await this.sendTombstone(outSpotTopic, String(value.id));
      return;
    }

    let restaurantData = value;

    // if the payload only has __op + id it means that amenity_hotel table have some changes,we will fetch full data from repo
    const keys = Object.keys(value);
    if (keys.length <= 2) { //&& keys.includes('__op') && keys.includes('id')) {
      try {
        restaurantData = await this.restaurantApplication.getRestaurantById(value.id);
        this.logger.debug(`Fetched restaurant ${value.id} from repository`);
      } catch (err) {
        this.logger.error(`Failed to fetch restaurant ${value.id}: ${err?.message ?? err}`);
        this.logUseCaseEnd('restaurant', false);
        return;
      }
    }

    // check if item is unpublished
    if (Number(restaurantData.state) !== 1 || Number(restaurantData.status) !== 2 || restaurantData.deleted_at != null) {
      await this.sendTombstone(outContentTopic, String(restaurantData.id));
      await this.sendTombstone(outSpotTopic, String(restaurantData.id));
      return;
    }

    const contentTransformed = await this.restaurantApplication.transformContentRestaurantData(restaurantData);
    const spotTransformed = await this.restaurantApplication.transformSpotRestaurantData(restaurantData);

    if (!contentTransformed || !spotTransformed) {
      this.logUseCaseEnd('restaurants', false);
      return;
    }

    const msgKey = String(key ?? contentTransformed._id);

    await this.producer.sendMessage(outContentTopic, msgKey, contentTransformed);
    this.logUseCaseEnd(outContentTopic, true, contentTransformed);

    await this.producer.sendMessage(outSpotTopic, msgKey, spotTransformed);
    this.logUseCaseEnd(outSpotTopic, true, spotTransformed);
  }
}
