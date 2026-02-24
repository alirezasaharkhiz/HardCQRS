import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TransformVideosUseCase } from './transform-videos.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('location_video')
export class TransformLocationVideoUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformVideoUseCase: TransformVideosUseCase,
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
      // this.logUseCaseEnd('location_video', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('location_video', key, value);
    if (!value || value.video_id == null) {
      this.logUseCaseEnd('location_video', false);
      return;
    }

    this.logUseCaseEnd('location_video', true, { __op: 'u', id: value.video_id });
    await this.transformVideoUseCase.execute(value.video_id, { __op: 'u', id: value.video_id });
  }
}

