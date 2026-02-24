import { Injectable } from '@nestjs/common';
import { KafkaProducerApplication } from '../../../../integration/event/drivers/kafka/kafka-producer.application';
import { ConfigService } from '@nestjs/config';
import { TopicHandler } from '../../../../integration/event/decorators/topic.decorator';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { AttractionApplication } from '../../applications/attraction.application';

@Injectable()
@TopicHandler('attractiontypes')
export class TransformAttractionTypesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly attractionApplication: AttractionApplication,
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
      // this.logUseCaseEnd('attractionTypes', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('attractionTypes', key, value);
    if (!value) {
      this.logUseCaseEnd('attractionTypes', false);
      return;
    }

    const outContentTopic = `${this.targetPrefix}content_attractionTypes`;
    const outSpotTopic = `${this.targetPrefix}spot_attractionTypes`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outContentTopic, String(value.id));
      await this.sendTombstone(outSpotTopic, String(value.id));
      return;
    }

    // unpublished state detection
    if (Number(value?.state) !== 1 || value?.deleted_at != null) {
      await this.sendTombstone(outContentTopic, String(value.id));
      await this.sendTombstone(outSpotTopic, String(value.id));
      return;
    }

    const transformed = await this.attractionApplication.transformAttractionTypeData(value);

    if (!transformed) {
      this.logUseCaseEnd('attractionTypes', false);
      return;
    }

    const msgKey = String(key ?? transformed._id);

    await this.producer.sendMessage(outContentTopic, msgKey, transformed);
    this.logUseCaseEnd('content_attractionTypes', true, transformed);

    await this.producer.sendMessage(outSpotTopic, msgKey, transformed);
    this.logUseCaseEnd('spot_attractionTypes', true, transformed);
  }
}
