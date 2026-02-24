import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { PageApplication } from '../../applications/page.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('pages')
export class TransformPagesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly pageApplication: PageApplication,
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
      // this.logUseCaseEnd('pages', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('pages', key, value);

    if (!value) {
      this.logUseCaseEnd('pages', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_pages`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    if (value?.deleted_at != null || value?.state !== 1) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.pageApplication.transformPageData(value);

    if (transformed) {
      await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
      this.logUseCaseEnd('content_pages', true, transformed);
    } else {
      this.logUseCaseEnd('content_pages', false);
    }
  }

}
