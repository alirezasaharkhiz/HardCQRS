import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { PostApplication } from '../../applications/post.application';

@Injectable()
@TopicHandler('posts')
export class TransformPostsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly postApplication: PostApplication,
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
      // this.logUseCaseEnd('posts', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('posts', key, value);

    if (!value) {
      this.logUseCaseEnd('posts', false);
      return;
    }

    const outTopic = `${this.targetPrefix}posts`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const isEmptyObject = (v: any) =>
      v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0;

    const isSparseOpIdOnly = (v: any) =>
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      Object.keys(v).length === 2 &&
      'id' in v &&
      '__op' in v;

    // fetch full row when payload is {} or { __op, id }
    let payload = value;
    if (isEmptyObject(payload) || isSparseOpIdOnly(payload)) {
      const lookupId = payload?.id != null ? Number(payload.id) : Number(key);
      if (!lookupId || Number.isNaN(lookupId)) {
        this.logUseCaseEnd('posts', false);
        return;
      }
      payload = await this.postApplication.getPostById(lookupId);
      if (!payload) {
        this.logUseCaseEnd('posts', false);
        return;
      }
    }

    if (Number(payload?.state) !== 1 || payload?.deleted_at != null) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.postApplication.transformPostData(payload);
    if (!transformed) {
      this.logUseCaseEnd('posts', false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd('posts', true, transformed);
  }
}
