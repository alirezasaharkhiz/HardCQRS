import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { SettingApplication } from '../../applications/setting.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('settings')
export class TransformSettingsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly settingApplication: SettingApplication,
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
      // this.logUseCaseEnd('settings', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('settings', key, value);

    if (!value) {
      this.logUseCaseEnd('settings', false);
      return;
    }

    const outContentTopic = `${this.targetPrefix}content_settings`;
    const outSpotTopic = `${this.targetPrefix}spot_settings`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outContentTopic, String(value.id));
      await this.sendTombstone(outSpotTopic, String(value.id));
      return;
    }

    if (value?.deleted_at != null) {
      await this.sendTombstone(outContentTopic, String(value.id));
      await this.sendTombstone(outSpotTopic, String(value.id));
      return;
    }

    const transformed = await this.settingApplication.transformSettingData(value);

    if (transformed) {
      const msgKey = String(key ?? transformed._id);
      await this.producer.sendMessage(outContentTopic, msgKey, transformed);
      this.logUseCaseEnd('content_settings', true, transformed);

      await this.producer.sendMessage(outSpotTopic, msgKey, transformed);
      this.logUseCaseEnd('spot_settings', true, transformed);
    } else {
      this.logUseCaseEnd('settings', false);
    }
  }
}
