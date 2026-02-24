import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { LikeApplication } from './applications/like.application';
import { TransformLikesUseCase } from './usecases/transformer/transform-likes.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    LikeApplication,
    TransformLikesUseCase
  ],
  exports: [
    LikeApplication,
    TransformLikesUseCase
  ],
})
export class LikeModule { }
