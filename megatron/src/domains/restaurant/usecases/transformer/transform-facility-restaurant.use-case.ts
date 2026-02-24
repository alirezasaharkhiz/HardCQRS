import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TransformRestaurantsUseCase } from './transform-restaurants.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('facility_restaurant')
export class TransformFacilityRestaurantUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformRestaurantUseCase: TransformRestaurantsUseCase,
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
      // this.logUseCaseEnd('facility_restaurant', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('facility_restaurant', key, value);
    if (!value || value.restaurant_id == null) {
      this.logUseCaseEnd('facility_restaurant', false);
      return;
    }

    this.logUseCaseEnd('facility_restaurant', true, { __op: 'u', id: value.restaurant_id });
    await this.transformRestaurantUseCase.execute(value.restaurant_id, { __op: 'u', id: value.restaurant_id });

  }
}
