import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { IgnoreApplication } from '../../applications/ignore.application';

@Injectable()
@TopicHandler('ignores')
export class TransformIgnoresUseCase extends BaseTransformUseCase {
  constructor(
    private readonly ignoreApplication: IgnoreApplication,
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
      // this.logUseCaseEnd('ignores', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('ignores', key, value);

    if (!value) {
      this.logUseCaseEnd('ignores', false);
      return;
    }

    const outTopic = `${this.targetPrefix}ignores`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.
    ignoreApplication.transformIgnoreData(value);

    if (transformed) {
      await this.producer.sendMessage(outTopic, key, transformed);
      this.logUseCaseEnd('ignores', true, transformed);
    } else {
      this.logUseCaseEnd('ignores', false);
    }
  }
}
