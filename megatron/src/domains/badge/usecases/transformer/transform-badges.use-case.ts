import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { BadgeApplication } from '../../applications/badge.application';

@Injectable()
@TopicHandler('badges')
export class TransformBadgesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly badgeApplication: BadgeApplication,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }

  async execute(key: string | null, value: any): Promise<void> {
    // skip __op -> "r"
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r') {
      // this.logUseCaseEnd('badges', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('badges', key, value);

    if (!value) {
      this.logUseCaseEnd('badges', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_badges`;

    // detect direct delete
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    // unpublished data detection
    if (value?.state !== 1 || value?.deleted_at != null) {
      this.logger.debug('badge is not published');
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.badgeApplication.transformBadgeData(value);

    if (transformed) {
      await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
      this.logUseCaseEnd('content_badges', true, transformed);
    } else {
      this.logUseCaseEnd('content_badges', false);
    }
  }
}
