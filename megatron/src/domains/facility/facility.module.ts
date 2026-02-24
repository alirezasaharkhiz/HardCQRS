import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { FacilityApplication } from './applications/facility.application';
import { TransformFacilitiesUseCase } from './usecases/transformer/transform-facilities.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    FacilityApplication,
    TransformFacilitiesUseCase
  ],
  exports: [
    FacilityApplication,
    TransformFacilitiesUseCase
  ],
})
export class FacilityModule { }
