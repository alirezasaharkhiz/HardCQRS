import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { LocationSqlRepository } from './repositories/sql/location.sql.repository';
import { LocationApplication } from './applications/location.application';
import { TransformLocationsUseCase } from './usecases/transformer/transform-locations.use-case';
import { SpotModule } from '../spot/spot.module';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
    forwardRef(() => SpotModule)
  ],
  providers: [
    LocationSqlRepository,

    LocationApplication,

    TransformLocationsUseCase
  ],
  exports: [
    LocationSqlRepository,

    LocationApplication,

    TransformLocationsUseCase
  ],
})
export class LocationModule { }
