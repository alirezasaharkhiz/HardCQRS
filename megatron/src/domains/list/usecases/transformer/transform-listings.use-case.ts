import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { ListApplication } from '../../applications/list.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('listings')
export class TransformListingsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly listApplication: ListApplication,
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
      // this.logUseCaseEnd('listings', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('listings', key, value);

    if (!value) {
      this.logUseCaseEnd('listings', false);
      return;
    }


    const outTopic = `${this.targetPrefix}content_listings`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    // check unpublished states
    if (Number(value?.state) !== 1 || Number(value?.status) !== 2 || value?.deleted_at != null) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.listApplication.transformListingData(value);

    if (!transformed) {
      this.logUseCaseEnd('content_listings', false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd('content_listings', true, transformed);
  }
}
