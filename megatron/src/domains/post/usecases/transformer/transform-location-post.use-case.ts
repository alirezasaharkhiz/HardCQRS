import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TransformPostsUseCase } from './transform-posts.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('location_post')
export class TransformLocationPostUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformPostUseCase: TransformPostsUseCase,
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
      // this.logUseCaseEnd('location_post', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('location_post', key, value);
    if (!value || value.post_id == null) {
      this.logUseCaseEnd('location_post', false);
      return;
    }

    this.logUseCaseEnd('location_post', true, { __op: 'u', id: value.post_id });
    await this.transformPostUseCase.execute(value.post_id, { __op: 'u', id: value.post_id });

  }
}

