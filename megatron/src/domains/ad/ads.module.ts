import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AdApplication } from './applications/ad-application.service';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { TransformTextAdsUseCase } from './usecases/transformer/transform-textads.use-case';



@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    AdApplication,
    TransformTextAdsUseCase,
  ],
  exports: [
    TransformTextAdsUseCase,
    AdApplication,
  ],
})
export class AdsModule { }
