import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { CompetitionApplication } from "../../applications/competition.application";

@Injectable()
@TopicHandler('competes')
export class TransformCompetesUseCase extends BaseTransformUseCase {
  constructor(
    private readonly competitionApplication: CompetitionApplication,
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
      // this.logUseCaseEnd('compete', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('compete', key, value);

    if (!value) {
      this.logUseCaseEnd('compete', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_competes`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.competitionApplication.transformCompeteData(value);

    if (!transformed) {
      this.logUseCaseEnd('content_competes', false);
      return;
    }

    await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
    this.logUseCaseEnd('content_competes', true, transformed);
  }
}
