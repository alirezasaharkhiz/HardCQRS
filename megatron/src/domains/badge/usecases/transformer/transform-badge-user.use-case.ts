import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { BadgeApplication } from '../../applications/badge.application';

@Injectable()
@TopicHandler('badge_user')
export class TransformBadgeUserUseCase extends BaseTransformUseCase {
  constructor(
    private readonly badgeApplication: BadgeApplication,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }

  async execute(key: string | null, value: any): Promise<void> {
    // skip Debezium snapshot events
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r'
    ) {
      // this.logUseCaseEnd('badge_user', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('badge_user', key, value);

    if (!value) {
      this.logUseCaseEnd('badge_user', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_badgeUser`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.badgeApplication.transformBadgeUserData(value);

    if (!transformed) {
      this.logUseCaseEnd('content_badgeUser', false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd('content_badgeUser', true, transformed);
  }
}
