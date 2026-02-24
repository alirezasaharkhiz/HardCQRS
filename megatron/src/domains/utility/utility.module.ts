import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { UtilityApplication } from './applications/utility.application';
import { TransformUtilitiesUseCase } from './usecases/transformer/transform-utilities.use-case';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    UtilityApplication,
    TransformUtilitiesUseCase
  ],
  exports: [
    UtilityApplication,
    TransformUtilitiesUseCase
  ],
})
export class UtilityModule { }
