import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TransformAttractionsUseCase } from './transform-attractions.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('attraction_attractiontype')
export class TransformAttractionAttractionTypeUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformAttractions: TransformAttractionsUseCase,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }

  async execute(key: string | null, value: any): Promise<void> {
    // Skip Debezium snapshot rows if present
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r'
    ) {
      // this.logUseCaseEnd('attraction_attractiontype', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('attraction_attractiontype', key, value);

    if (!value || value.attraction_id == null) {
      this.logUseCaseEnd('attraction_attractiontype', false);
      return;
    }

    this.logUseCaseEnd('attraction_attractiontype', true, value);
    await this.transformAttractions.execute(value.attraction_id, { __op: 'u', id: value.attraction_id });
  }
}
