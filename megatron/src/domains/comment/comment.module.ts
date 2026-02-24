import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { CommentApplication } from './applications/comment.application';
import { TransformCommentsUseCase } from './usecases/transformer/transform-comments.use-case';
import { CommentSqlRepository } from './repositories/sql/comment.sql.repository';
import { PostModule } from '../post/post.module';
import { VideoModule } from '../video/video.module';
import { ReviewModule } from '../review/review.module';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
    forwardRef(() => PostModule),
    forwardRef(() => VideoModule),
    forwardRef(() => ReviewModule),
  ],
  providers: [
    CommentSqlRepository,
    CommentApplication,
    TransformCommentsUseCase,
  ],
  exports: [
    CommentSqlRepository,
    CommentApplication,
    TransformCommentsUseCase,
  ],
})
export class CommentModule { }
