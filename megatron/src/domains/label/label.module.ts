import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { LabelApplication } from './applications/label.application';
import { TransformLabelsUseCase } from './usecases/transformer/transform-labels.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    LabelApplication,
    TransformLabelsUseCase
  ],
  exports: [
    LabelApplication,
    TransformLabelsUseCase
  ],
})
export class LabelModule { }
