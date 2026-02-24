import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TransformPostsUseCase } from '../../../post/usecases/transformer/transform-posts.use-case';
import { TransformVideosUseCase } from '../../../video/usecases/transformer/transform-videos.use-case';
import { TransformReviewsUseCase } from '../../../review/usecases/transformer/transform-reviews.use-case';
import { CommentApplication } from '../../applications/comment.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';

@Injectable()
@TopicHandler('comments')
export class TransformCommentsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly commentApplication: CommentApplication,
    private readonly transformPosts: TransformPostsUseCase,
    private readonly transformVideos: TransformVideosUseCase,
    private readonly transformReviews: TransformReviewsUseCase,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }

  async execute(key: string | null, value: any): Promise<void> {
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r') {
      // this.logUseCaseEnd('comments', false, { reason: 'snapshot(op=r)' });
      return;
    }

    let deleteFlag = false;
    const { id } = value || {};
    const outTopic = `${this.targetPrefix}comments`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      deleteFlag = true;
      await this.sendTombstone(outTopic, String(value.id));
    }

    this.logReceiveData('comments', key, value);

    if (!value) {
      this.logUseCaseEnd('comments', false);
      return;
    }

    //delete item if its unpublished
    const isPublished = Number(value.state) === 1 && Number(value.status) === 2;
    if (!isPublished) {
      deleteFlag = true;
      await this.sendTombstone(outTopic, String(value.id));
    }

    const transformed = await this.commentApplication.transformCommentData(value);

    if (transformed && !deleteFlag) {
      const msgKey = Number(id ?? key ?? '');
      if (!msgKey) {
        this.logger.error('comments upsert skipped: missing key/_id');
        this.logUseCaseEnd('comments', false);
        return;
      }

      (transformed as any)._id = msgKey;

      await this.producer.sendMessage(outTopic, msgKey, transformed);
      this.logUseCaseEnd('comments', true, transformed);
    }

    const commentableKey = value.commentable_id != null ? String(value.commentable_id) : null;

    // if belongs to a post or any other entity, re-transform that entity
    if (commentableKey) {
      if (value.commentable_type === 'Kaban\\Models\\Post') {
        await this.transformPosts.execute(commentableKey, {});
      }
      else if (value.commentable_type === 'Kaban\\Models\\Video') {
        await this.transformVideos.execute(commentableKey, {});
      } else if (value.commentable_type == 'Kaban\\Models\\Review') {
        await this.transformReviews.execute(commentableKey, {});
      }
    }
  }
}
