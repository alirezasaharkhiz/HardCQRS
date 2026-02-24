import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { FaqApplication } from './applications/faqs.application';
import { TransformFaqsUseCase } from './usecases/transformer/transform-faqs.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    FaqApplication,
    TransformFaqsUseCase
  ],
  exports: [
    FaqApplication,
    TransformFaqsUseCase
  ],
})
export class FaqModule { }
