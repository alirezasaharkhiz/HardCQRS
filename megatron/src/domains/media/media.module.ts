import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { MediaApplication } from './applications/media.application';
import { TransformMediaUseCase } from './usecases/transformer/transform-media.use-case';
import { TransformMediablesUseCase } from './usecases/transformer/transform-mediables.use-case';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
  ],
  providers: [
    MediaApplication,

    TransformMediaUseCase,
    TransformMediablesUseCase
  ],
  exports: [
    MediaApplication,

    TransformMediaUseCase,
    TransformMediablesUseCase
  ],
})
export class MediaModule { }
