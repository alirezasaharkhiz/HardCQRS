import { Injectable } from '@nestjs/common';
import { TransformHotelsUseCase } from '../../../hotel/usecases/transformer/transform-hotels.use-case';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { ConfigService } from '@nestjs/config';
import { TransformRestaurantsUseCase } from '../../../restaurant/usecases/transformer/transform-restaurants.use-case';
import { TransformLocationsUseCase } from '../../../location/usecases/transformer/transform-locations.use-case';
import { TransformAttractionsUseCase } from '../../../attraction/usecases/transformer/transform-attractions.use-case';
import { TransformAgenciesUseCase } from '../../../agency/usecases/transformer/transform-agencies.use-case';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';

@Injectable()
@TopicHandler('spot_ranks')
export class TransformSpotRanksUseCase extends BaseTransformUseCase {
  constructor(
    private readonly transformHotels: TransformHotelsUseCase,
    private readonly transformRestaurants: TransformRestaurantsUseCase,
    private readonly transformLocations: TransformLocationsUseCase,
    private readonly transformAttractions: TransformAttractionsUseCase,
    private readonly transformAgencies: TransformAgenciesUseCase,
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

    this.logReceiveData('spot_ranks', key, value);

    if (!value) {
      this.logUseCaseEnd('spot_ranks', false);
      return;
    }

    if (!value || value.spot_type == null || value.spot_id == null) {
      this.logUseCaseEnd('spot_ranks', false);
      return;
    }

    switch (value.spot_type) {
      case 'Kaban\\Models\\Agency':
        await this.transformAgencies.execute(value.spot_id, { __op: 'u', id: value.spot_id });
        break;

      case 'Kaban\\Models\\Attraction':
        await this.transformAttractions.execute(value.spot_id, { __op: 'u', id: value.spot_id });
        break;

      case 'Kaban\\Models\\Hotel':
        await this.transformHotels.execute(value.spot_id, { __op: 'u', id: value.spot_id });
        break;

      case 'Kaban\\Models\\Restaurant':
        await this.transformRestaurants.execute(value.spot_id, { __op: 'u', id: value.spot_id });
        break;

      case 'Kaban\\Models\\Location':
        await this.transformLocations.execute(value.spot_id, { __op: 'u', id: value.spot_id });
        break;

      default:
        console.warn("Unknown spot type:", value.spot_type);
        this.logUseCaseEnd('spot_ranks', false);
        return;
    }
  }
}