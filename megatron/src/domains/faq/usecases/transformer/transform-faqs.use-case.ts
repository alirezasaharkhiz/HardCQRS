import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { FaqApplication } from '../../applications/faqs.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('faqs')
export class TransformFaqsUseCase extends BaseTransformUseCase {
  constructor(
    private readonly faqApplication: FaqApplication,
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
      // this.logUseCaseEnd('facility_restaurant', false, { reason: 'snapshot(op=r)' });
      return;
    }

    this.logReceiveData('faqs', key, value);

    if (!value) {
      this.logUseCaseEnd('faqs', false);
      return;
    }

    const contentOutTopic = `${this.targetPrefix}content_faqs`;
    const spotOutTopic = `${this.targetPrefix}spot_faqs`;

    if (
      value &&
      typeof value === 'object' &&
      Object.prototype.hasOwnProperty.call(value, '__op') &&
      value.__op === 'd') {
      await this.sendTombstone(contentOutTopic, String(value.id));
      await this.sendTombstone(spotOutTopic, String(value.id));
      return;
    }

    //only for contents
    let canTransferContentData = true;
    if (Number(value?.output) !== 1) {
      await this.sendTombstone(contentOutTopic, String(value.id));
      canTransferContentData = false;
    }

    let transformedContentData = null;
    if (canTransferContentData) {
      transformedContentData = await this.faqApplication.transformContentFaqData(value);
    }

    const transformedSpotData = await this.faqApplication.transformSpotFaqData(value);


    if (transformedContentData) {
      await this.producer.sendMessage(contentOutTopic, String(value.id), transformedContentData);
      this.logUseCaseEnd('content_faqs', true, transformedContentData);
    } else if (!canTransferContentData) {
      this.logUseCaseEnd('content_faqs', true);
    } else {
      this.logUseCaseEnd('content_faqs', false);
    }

    if (transformedSpotData) {
      await this.producer.sendMessage(spotOutTopic, String(value.id), transformedSpotData);
      this.logUseCaseEnd('spot_faqs', true, transformedSpotData);
    } else {
      this.logUseCaseEnd('spot_faqs', false);
    }
  }
}
