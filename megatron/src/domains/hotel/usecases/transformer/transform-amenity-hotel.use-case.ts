import { Injectable } from '@nestjs/common';
import { TransformHotelsUseCase } from '../../../hotel/usecases/transformer/transform-hotels.use-case';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { ConfigService } from '@nestjs/config';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';

@Injectable()
@TopicHandler('amenity_hotel')
export class TransformAmenityHotelUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformHotels: TransformHotelsUseCase,
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
      // this.logUseCaseEnd('amenity_hotel', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('amenity_hotel', key, value);

    if (!value) {
      this.logUseCaseEnd('amenity_hotel', false);
      return;
    }

    if (!value || value.hotel_id == null) {
      this.logUseCaseEnd('amenity_hotel', false);
      return;
    }

    await this.transformHotels.execute(value.hotel_id, { __op: 'u', id: value.hotel_id });
  }
}