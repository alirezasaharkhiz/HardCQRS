import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TransformRestaurantsUseCase } from './transform-restaurants.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('restaurant_restauranttype')
export class TransformRestaurantRestaurantTypeUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformRestaurantsUseCase: TransformRestaurantsUseCase,
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
      value.__op === 'r'
    ) {
      // this.logUseCaseEnd('location_parameter', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('restaurant_restauranttype', key, value);
    if (!value || value.restaurant_id == null) {
      this.logUseCaseEnd('restaurant_restauranttype', false);
      return;
    }

    this.logUseCaseEnd('restaurant_restauranttype', true, { __op: 'u', id: value.restaurant_id });
    await this.transformRestaurantsUseCase.execute(value.restaurant_id, { __op: 'u', id: value.restaurant_id });
  }
}

