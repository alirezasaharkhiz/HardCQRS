import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { FeatureApplication } from '../../applications/feature.application';

@Injectable()
@TopicHandler('feature_review') // db.lastsecondb.feature_review
export class TransformFeatureReviewUseCase extends BaseTransformUseCase {
    constructor(
        private readonly featureApplication: FeatureApplication,
        producer: KafkaProducerApplication,
        config: ConfigService,
    ) {
        super(producer, config);
    }

    async execute(key: string | null, value: any): Promise<void> {

        // ignore snapshot silently
        if (value && typeof value === 'object' && value.__op === 'r') {
            return;
        }

        const outTopic = `${this.targetPrefix}spot_featureReview`;
        this.logReceiveData('feature_review', key, value);

        // deletes
        if (!value || value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id ?? key ?? ''));
            return;
        }

        // no unpublished state

        const doc = await this.featureApplication.transformSpotFeatureReviewData(value);
        if (!doc) {
            this.logUseCaseEnd('spot_featureReview', false, { reason: 'transformed data is null' });
            return;
        }

        await this.producer.sendMessage(outTopic, String(doc._id), doc);
        this.logUseCaseEnd('spot_featureReview', true, doc);
    }
}
