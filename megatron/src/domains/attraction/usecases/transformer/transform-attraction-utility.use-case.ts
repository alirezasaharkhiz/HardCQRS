import { Injectable } from '@nestjs/common';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { ConfigService } from '@nestjs/config';
import { TransformAttractionsUseCase } from './transform-attractions.use-case';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';

@Injectable()
@TopicHandler('attraction_utility')
export class TransformAttractionUtilityUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformAttractions: TransformAttractionsUseCase,
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
      // this.logUseCaseEnd('amenity_hotel', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('attraction_utility', key, value);

    if (!value) {
      this.logUseCaseEnd('attraction_utility', false);
      return;
    }

    if (!value || value.attraction_id == null) {
      this.logUseCaseEnd('attraction_utility', false);
      return;
    }

    await this.transformAttractions.execute(value.attraction_id, { __op: 'u', id: value.attraction_id });
  }
}