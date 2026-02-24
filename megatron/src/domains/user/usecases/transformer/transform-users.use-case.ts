import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { UserApplication } from '../../applications/user.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('users')
export class TransformUsersUseCase extends BaseTransformUseCase {
  constructor(
    private readonly userApplication: UserApplication,
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
      // this.logUseCaseEnd('users', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('users', key, value);

    if (!value) {
      this.logUseCaseEnd('users', false);
      return;
    }

    const contentOutTopic = `${this.targetPrefix}content_users`;
    const spotOutTopic = `${this.targetPrefix}spot_users`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    if (value?.deleted_at != null) {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    const transformedForContent = await this.userApplication.transformContentUserData(value);
    const transformedForSpot = await this.userApplication.transformSpotUserData(value);

    if (transformedForContent) {
      await this.producer.sendMessage(contentOutTopic, String(transformedForContent._id), transformedForContent);
      this.logUseCaseEnd(contentOutTopic, true, transformedForContent);
    } else {
      this.logUseCaseEnd(contentOutTopic, false);
    }

    if (transformedForSpot) {
      await this.producer.sendMessage(spotOutTopic, String(transformedForSpot._id), transformedForSpot);
      this.logUseCaseEnd(spotOutTopic, true, transformedForSpot);
    } else {
      this.logUseCaseEnd(spotOutTopic, false);
    }
  }

}
