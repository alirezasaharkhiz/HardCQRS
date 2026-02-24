import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { IgnoreApplication } from './applications/ignore.application';
import { TransformIgnoresUseCase } from './usecases/transformer/transform-ignores.use-case';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    IgnoreApplication,
    TransformIgnoresUseCase
  ],
  exports: [
    IgnoreApplication,
    TransformIgnoresUseCase
  ],
})
export class IgnoreModule { }
