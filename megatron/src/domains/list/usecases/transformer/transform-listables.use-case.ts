import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { ListApplication } from '../../applications/list.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('listables')
export class TransformListablesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly listApplication: ListApplication,
    producer: KafkaProducerApplication,
    config: ConfigService,
  ) {
    super(producer, config);
  }

  async execute(key: string | null, value: any): Promise<void> {
    // Skip Debezium snapshot rows if present
    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'r'
    ) {
      // this.logUseCaseEnd('listables', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('listables', key, value);

    if (!value) {
      this.logUseCaseEnd('listables', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_listables`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.listApplication.transformListableData(value);

    if (!transformed) {
      this.logUseCaseEnd('content_listables', false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd('content_listables', true, transformed);
  }
}
