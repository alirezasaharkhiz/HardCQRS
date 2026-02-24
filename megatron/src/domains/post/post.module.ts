import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { LocationPostSqlRepository } from './repositories/sql/location-post.sql.repository';
import { PostSqlRepository } from './repositories/sql/post.sql.repository';
import { PostApplication } from './applications/post.application';
import { TransformLocationPostUseCase } from './usecases/transformer/transform-location-post.use-case';
import { TransformPostsUseCase } from './usecases/transformer/transform-posts.use-case';
import { CommentModule } from '../comment/comment.module';

@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
    forwardRef(() => CommentModule)
  ],
  providers: [
    LocationPostSqlRepository,
    PostSqlRepository,

    PostApplication,

    TransformLocationPostUseCase,
    TransformPostsUseCase
  ],
  exports: [
    LocationPostSqlRepository,
    PostSqlRepository,

    PostApplication,

    TransformLocationPostUseCase,
    TransformPostsUseCase
  ],
})
export class PostModule { }
