import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { FacilityApplication } from '../../applications/facility.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('facilities')
export class TransformFacilitiesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly facilityApplication: FacilityApplication,
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
      // this.logUseCaseEnd('facilities', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('facilities', key, value);

    if (!value) {
      this.logUseCaseEnd('facilities', false);
      return;
    }

    const contentOutTopic = `${this.targetPrefix}content_facilities`;
    const spotOutTopic = `${this.targetPrefix}spot_facilities`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    // check unpublished status
    if (Number(value?.state) !== 1 || value?.deleted_at != null) {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    const transformed = await this.facilityApplication.transformFacilityData(value);

    if (!transformed) {
      this.logUseCaseEnd('facilities', false);
      return;
    }

    const msgKey = String(key ?? transformed._id);

    await this.producer.sendMessage(contentOutTopic, msgKey, transformed);
    this.logUseCaseEnd(contentOutTopic, true, transformed);

    await this.producer.sendMessage(spotOutTopic, msgKey, transformed);
    this.logUseCaseEnd(spotOutTopic, true, transformed);
  }
}
