import { Injectable } from '@nestjs/common';

import { KafkaProducerApplication } from '../../../../integration/event/drivers/kafka/kafka-producer.application';
import { ConfigService } from '@nestjs/config';
import { TopicHandler } from '../../../../integration/event/decorators/topic.decorator';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { AirlineApplication } from '../../applications/airline.application';

@Injectable()
@TopicHandler('airlines')
export class TransformAirlinesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly airlineApplication: AirlineApplication,
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
      // this.logUseCaseEnd('airlines', false, { reason: 'snapshot(op=r)' });
      return;
    }

    const outTopic = `${this.targetPrefix}airlines`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    this.logReceiveData('airlines', key, value);

    if (!value) {
      this.logUseCaseEnd('airlines', false);
      return;
    }
    const transformed = await this.airlineApplication.transformAirlineData(value);

    if (transformed) {
      await this.producer.sendMessage(outTopic, key, transformed);
      this.logUseCaseEnd('airlines', true, transformed);
    } else {
      this.logUseCaseEnd('airlines', false);
    }
  }
}
