import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { LocationVideoSqlRepository } from './repositories/sql/location-video.sql.repository';
import { VideoSqlRepository } from './repositories/sql/video.sql.repository';
import { VideoApplication } from './applications/video.application';
import { TransformLocationVideoUseCase } from './usecases/transformer/transform-location-video.use-case';
import { TransformVideoQualitiesUseCase } from './usecases/transformer/transform-video-qualities.use-case';
import { TransformVideosUseCase } from './usecases/transformer/transform-videos.use-case';
import { CommentModule } from '../comment/comment.module';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
    forwardRef(() => CommentModule)
  ],
  providers: [
    LocationVideoSqlRepository,
    VideoSqlRepository,

    VideoApplication,

    TransformLocationVideoUseCase,
    TransformVideoQualitiesUseCase,
    TransformVideosUseCase
  ],
  exports: [
    LocationVideoSqlRepository,
    VideoSqlRepository,

    VideoApplication,

    TransformLocationVideoUseCase,
    TransformVideoQualitiesUseCase,
    TransformVideosUseCase
  ],
})
export class VideoModule { }
