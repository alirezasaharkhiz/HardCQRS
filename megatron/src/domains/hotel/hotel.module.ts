import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { HotelApplication } from './applications/hotel.application';
import { AmenityHotelSqlRepository } from './repositories/sql/amenity-hotel.sql.repository';
import { HotelSqlRepository } from './repositories/sql/hotel.sql.repository';
import { TransformAmenitiesUseCase } from './usecases/transformer/transform-amenities.use-case';
import { TransformAmenityHotelUseCase } from './usecases/transformer/transform-amenity-hotel.use-case';
import { TransformHotelsUseCase } from './usecases/transformer/transform-hotels.use-case';
import { AmenityApplication } from './applications/amenity.application';
import { AmenitySqlRepository } from './repositories/sql/amenity.sql.repository';
import { SpotModule } from '../spot/spot.module';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
    forwardRef(() => SpotModule)
  ],
  providers: [
    AmenityHotelSqlRepository,
    AmenitySqlRepository,
    HotelSqlRepository,

    HotelApplication,
    AmenityApplication,

    TransformAmenitiesUseCase,
    TransformAmenityHotelUseCase,
    TransformHotelsUseCase,
  ],
  exports: [
    AmenityHotelSqlRepository,
    AmenitySqlRepository,
    HotelSqlRepository,

    HotelApplication,
    AmenityApplication,

    TransformAmenitiesUseCase,
    TransformAmenityHotelUseCase,
    TransformHotelsUseCase,
  ],
})
export class HotelModule { }