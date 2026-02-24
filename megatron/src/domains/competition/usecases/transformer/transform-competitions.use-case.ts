import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { CompetitionApplication } from '../../applications/competition.application';

@Injectable()
@TopicHandler('competitions')
export class TransformCompetitionsUseCase extends BaseTransformUseCase {
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
      // this.logUseCaseEnd('competitions', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('competitions', key, value);

    if (!value) {
      this.logUseCaseEnd('competitions', false);
      return;
    }

    const outTopic = `${this.targetPrefix}content_competitions`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    // check unpublished state
    if (value?.deleted_at != null || Number(value?.state) !== 1) {
      await this.sendTombstone(outTopic, String(value.id));
      return;
    }

    const transformed = await this.competitionApplication.transformCompetitionData(value);

    if (!transformed) {
      this.logUseCaseEnd('content_competitions', false);
      return;
    }

    const msgKey = String(key ?? transformed._id);
    await this.producer.sendMessage(outTopic, msgKey, transformed);
    this.logUseCaseEnd('content_competitions', true, transformed);
  }
}
