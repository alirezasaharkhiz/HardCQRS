import { Injectable } from '@nestjs/common';
import { KafkaProducerApplication } from '../../../../integration/event/drivers/kafka/kafka-producer.application';
import { ConfigService } from '@nestjs/config';
import { TopicHandler } from '../../../../integration/event/decorators/topic.decorator';
import { AdApplication } from '../../applications/ad-application.service';
import { BaseTransformUseCase } from 'src/core/contracts/usecases/transformer/base-transform.use-case';

@Injectable()
@TopicHandler('textads')
export class TransformTextAdsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly adApplication: AdApplication,
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
      // this.logUseCaseEnd('textads', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('textads', key, value);

    if (!value) {
      this.logUseCaseEnd('textads', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_textads`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    // detect unpublished state
    if (value?.deleted_at != null || Number(value?.state) !== 1) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.adApplication.transformTextAdData(value);

    if (!transformed) {
      this.logUseCaseEnd(outTopic, false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd(outTopic, true, transformed);
  }
}
