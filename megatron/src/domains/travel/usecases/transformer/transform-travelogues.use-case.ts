import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { TravelApplication } from '../../applications/travel.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('travelogues')
export class TransformTraveloguesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly travelApplication: TravelApplication,
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
      value.__op === 'r'
    ) {
      // this.logUseCaseEnd('travelogues', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('travelogues', key, value);
    if (!value) {
      this.logUseCaseEnd('travelogues', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_travelogues`;

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
        this.logUseCaseEnd('travelogues', false);
        return;
      }
      payload = await this.travelApplication.getTravelogueById(lookupId);
      if (!payload) {
        this.logUseCaseEnd('travelogues', false);
        return;
      }
    }

    if (Number(payload?.state) !== 1 || Number(payload?.status) !== 2 || payload?.deleted_at != null) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    if (payload.type !== 1) {
      await this.sendTombstone(outTopic, String(value.id));

      return;
    }

    const transformed = await this.travelApplication.transformTravelogueData(payload);
    if (!transformed) {
      this.logUseCaseEnd(outTopic, false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd(outTopic, true, transformed);
  }
}
