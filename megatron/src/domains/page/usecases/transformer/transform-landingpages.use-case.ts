import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { PageApplication } from '../../applications/page.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('landingpages')
export class TransformLandingPagesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly pageApplication: PageApplication,
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
      // this.logUseCaseEnd('landingpages', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('landingpages', key, value);

    if (!value) {
      this.logUseCaseEnd('landingpages', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_landingpages`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    // detect unpublished item
    if (value?.deleted_at != null || Number(value?.state) !== 1) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.pageApplication.transformLandingPageData(value);

    if (!transformed) {
      this.logUseCaseEnd('content_landingpages', false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd('content_landingpages', true, transformed);
  }
}
