import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { MediaApplication } from '../../applications/media.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('media')
export class TransformMediaUseCase extends BaseTransformUseCase {
  constructor(
    private readonly mediaApplication: MediaApplication,
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
      // this.logUseCaseEnd('media', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('media', key, value);

    if (!value) {
      this.logUseCaseEnd('media', false);
      return;
    }

    const contentOutTopic = `${this.targetPrefix}content_media`;
    const spotOutTopic = `${this.targetPrefix}spot_media`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    if (value?.deleted_at != null) {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    const transformed = await this.mediaApplication.transformMediaData(value);

    if (transformed) {
      await this.producer.sendMessage(contentOutTopic, key, transformed);
      this.logUseCaseEnd(contentOutTopic, true, transformed);

      await this.producer.sendMessage(spotOutTopic, key, transformed);
      this.logUseCaseEnd(spotOutTopic, true, transformed);
    } else {
      this.logUseCaseEnd('media', false);
    }
  }
}
