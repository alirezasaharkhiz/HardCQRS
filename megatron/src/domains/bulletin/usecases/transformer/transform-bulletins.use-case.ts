import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { BulletinApplication } from '../../applications/bulletin.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('bulletins')
export class TransformBulletinsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly bulletinApplication: BulletinApplication,
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
      // this.logUseCaseEnd('bulletin', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('bulletin', key, value);

    if (!value) {
      this.logUseCaseEnd('bulletin', false);
      return;
    }

    const contentOutTopic = `${this.targetPrefix}content_bulletins`;
    const spotOutTopic = `${this.targetPrefix}spot_bulletins`;

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
      this.logger.debug('Bulletin is soft-deleted; skipping.');
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return null;
    }


    const transformedForContent = await this.bulletinApplication.transformContentBulletinData(value);
    const transformedForSpot = await this.bulletinApplication.transformSpotBulletinData(value);

    if (!transformedForContent || !transformedForSpot) {
      this.logUseCaseEnd('bulletin', false);
      return;
    }

    await this.producer.sendMessage(contentOutTopic, String(value.id), transformedForContent);
    this.logUseCaseEnd('content_bulletins', true, transformedForContent);

    await this.producer.sendMessage(spotOutTopic, String(value.id), transformedForSpot);
    this.logUseCaseEnd('spot_bulletins', true, transformedForSpot);
  }
}
