import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { TourApplication } from './applications/tour.application';
import { TransformTourRequestOnlineTermsUseCase } from './usecases/transformer/transform-tour-request-online-terms.use-case';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    TourApplication,
    TransformTourRequestOnlineTermsUseCase
  ],
  exports: [
    TourApplication,
    TransformTourRequestOnlineTermsUseCase
  ],
})
export class TourModule { }
