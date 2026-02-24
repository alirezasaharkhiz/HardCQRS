import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KafkaTopicRouterModule } from 'src/integration/event/drivers/kafka/kafka.module';
import { ReviewSqlRepository } from './repositories/sql/review.sql.repository';
import { ReviewApplication } from './applications/review.application';
import { TransformReviewsUseCase } from './usecases/transformer/transform-reviews.use-case';
import { CommentModule } from '../comment/comment.module';


@Module({
  imports: [
    ConfigModule,
    KafkaTopicRouterModule,
    forwardRef(() => CommentModule)
  ],
  providers: [
    ReviewSqlRepository,
    ReviewApplication,
    TransformReviewsUseCase
  ],
  exports: [
    ReviewSqlRepository,
    ReviewApplication,
    TransformReviewsUseCase
  ],
})
export class ReviewModule { }
