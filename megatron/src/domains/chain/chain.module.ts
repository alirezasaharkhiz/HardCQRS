import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { ChainApplication } from './applications/chain.application';
import { TransformChainsUseCase } from './usecases/transformer/transform-chains-use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    ChainApplication,
    TransformChainsUseCase,
  ],
  exports: [
    ChainApplication,
    TransformChainsUseCase,
  ],
})
export class ChainModule { }
