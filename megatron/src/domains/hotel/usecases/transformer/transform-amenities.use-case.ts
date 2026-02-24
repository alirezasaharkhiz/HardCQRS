import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { AmenityApplication } from '../../applications/amenity.application';

@Injectable()
@TopicHandler('amenities')
export class TransformAmenitiesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly amenityApplication: AmenityApplication,
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
      // this.logUseCaseEnd('amenities', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('amenities', key, value);

    const contentOutTopic = `${this.targetPrefix}content_amenities`;
    const spotOutTopic = `${this.targetPrefix}spot_amenities`;

    if (!value) {
      this.logUseCaseEnd('amenities', false);
      return;
    }

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    // unpublished state detection
    if (Number(value?.state) !== 1 || value?.deleted_at != null) {
      this.logger.debug(
        `Amenity filtered out (state=${value?.state}, deleted_at=${value?.deleted_at})`
      );
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    const transformed = await this.amenityApplication.transformAmenityData(value);

    if (!transformed) {
      this.logUseCaseEnd('amenities', false);
      return;
    }

    const msgKey = String(key ?? transformed._id);
    await this.producer.sendMessage(contentOutTopic, msgKey, transformed);
    this.logUseCaseEnd('content_amenities', true, transformed);
    await this.producer.sendMessage(spotOutTopic, msgKey, transformed);
    this.logUseCaseEnd('spot_amenities', true, transformed);
  }
}
