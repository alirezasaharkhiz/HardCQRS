import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TransformParametersUseCase } from './transform-parameters.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('location_parameter')
export class TransformLocationParameterUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformParametersUseCase: TransformParametersUseCase,
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

    this.logReceiveData('location_parameter', key, value);
    if (!value || value.parameter_id == null) {
      this.logUseCaseEnd('location_parameter', false);
      return;
    }

    this.logUseCaseEnd('location_parameter', true, { __op: 'u', id: value.parameter_id });
    await this.transformParametersUseCase.execute(value.parameter_id, { __op: 'u', id: value.parameter_id });
  }
}

