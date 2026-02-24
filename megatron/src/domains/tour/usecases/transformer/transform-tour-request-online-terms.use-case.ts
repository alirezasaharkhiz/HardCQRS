import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { TourApplication } from '../../applications/tour.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('tour_request_online_terms')
export class TransformTourRequestOnlineTermsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly tourApplication: TourApplication,
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
      // this.logUseCaseEnd('tour_request_online_terms', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('tour_request_online_terms', key, value);

    if (!value) {
      this.logUseCaseEnd('tour_request_online_terms', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_tourRequestOnlineTerms`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    if (value?.state !== 1 || value?.status !== 1 || value?.deleted_at != null) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.tourApplication.transformTourRequestOnlineTermsData(value);

    if (!transformed) {
      this.logUseCaseEnd(outTopic, false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd(outTopic, true, transformed);
  }
}
