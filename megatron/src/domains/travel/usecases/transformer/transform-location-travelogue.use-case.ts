import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TransformTraveloguesUseCase } from './transform-travelogues.use-case';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';

@Injectable()
@TopicHandler('location_travelogue')
export class TransformLocationTravelogueUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformTravelogueUseCase: TransformTraveloguesUseCase,
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
      // this.logUseCaseEnd('location_travelogue', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('location_travelogue', key, value);
    if (!value || value.travelogue_id == null) {
      this.logUseCaseEnd('location_travelogue', false);
      return;
    }

    this.logUseCaseEnd('location_travelogue', true, { __op: 'u', id: value.travelogue_id });
    await this.transformTravelogueUseCase.execute(value.travelogue_id, { __op: 'u', id: value.travelogue_id });
  }
}

