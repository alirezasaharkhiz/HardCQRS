import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { LabelApplication } from '../../applications/label.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('labels')
export class TransformLabelsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly labelApplication: LabelApplication,
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
      // this.logUseCaseEnd('labels', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('labels', key, value);

    if (!value) {
      this.logUseCaseEnd('labels', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_labels`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    if (value?.state !== 1 || value?.deleted_at != null) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.labelApplication.transformLabelData(value);

    if (transformed) {
      await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
      this.logUseCaseEnd('content_labels', true, transformed);
    } else {
      this.logUseCaseEnd('content_labels', false);
    }
  }
}
