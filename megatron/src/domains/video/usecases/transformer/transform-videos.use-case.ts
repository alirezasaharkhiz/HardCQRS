import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { VideoApplication } from '../../applications/video.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('videos')
export class TransformVideosUseCase extends BaseTransformUseCase {
  constructor(
    private readonly videoApplication: VideoApplication,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }


  async execute(key: string | null, value: any): Promise<void> {
    // Skip Debezium snapshot rows
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r'
    ) {
      // this.logUseCaseEnd('videos', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('videos', key, value);

    if (!value) {
      this.logUseCaseEnd('videos', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_videos`;

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

    // Fetch full row when payload is {} or exactly { __op, id }
    let payload = value;
    if (isEmptyObject(payload) || isSparseOpIdOnly(payload)) {
      const lookupId = payload?.id != null ? Number(payload.id) : Number(key);
      if (!lookupId || Number.isNaN(lookupId)) {
        this.logUseCaseEnd('videos', false);
        return;
      }
      payload = await this.videoApplication.getVideoById(lookupId);
      if (!payload) {
        this.logUseCaseEnd('videos', false);
        return;
      }
    }

    // unpublished item detection
    if (Number(payload.state) !== 1 || Number(payload.status) !== 3 || payload.deleted_at != null) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.videoApplication.transformVideoData(payload);
    if (!transformed) {
      this.logUseCaseEnd(outTopic, false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd(outTopic, true, transformed);
  }
}
