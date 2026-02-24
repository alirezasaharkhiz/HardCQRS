import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { CategoryApplication } from '../../applications/category.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('categories')
export class TransformCategoriesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly categoryApplication: CategoryApplication,
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
      // this.logUseCaseEnd('categories', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('categories', key, value);

    if (!value) {
      this.logUseCaseEnd('categories', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_categories`;

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

    const transformed = await this.categoryApplication.transformCategoryData(value);

    if (transformed) {
      await this.producer.sendMessage(outTopic, key, transformed);
      this.logUseCaseEnd('content_categories', true, transformed);
    } else {
      this.logUseCaseEnd('content_categories', false);
    }
  }
}
