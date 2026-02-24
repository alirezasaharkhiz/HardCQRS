import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { ReviewApplication } from '../../applications/review.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('reviews')
export class TransformReviewsUseCase extends BaseTransformUseCase {
    constructor(
        private readonly reviewApplication: ReviewApplication,
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

        const outTopic = `${this.targetPrefix}spot_reviews`;
        this.logReceiveData('reviews', key, value);

        // deletes
        if (value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id ?? key ?? ''));
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
                this.logUseCaseEnd('reviews', false);
                return;
            }
            payload = await this.reviewApplication.getReviewById(lookupId);
            if (!payload) {
                this.logUseCaseEnd('reviews', false);
                return;
            }
        }

        // unpublished item detection
        if (!(Number(payload?.state) === 1 && Number(payload?.status) === 2 && payload?.deleted_at == null)) {
            await this.sendTombstone(outTopic, String(payload.id));
            return;
        }

        const doc = await this.reviewApplication.transformSpotReviewData(payload);
        if (!doc) return;

        const msgKey = String(doc._id);
        await this.producer.sendMessage(outTopic, msgKey, doc);
        this.logUseCaseEnd(outTopic, true, doc);
    }
}
