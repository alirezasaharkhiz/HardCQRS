import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { LikeApplication } from '../../applications/like.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('likes')
export class TransformLikesUseCase extends BaseTransformUseCase {
    constructor(
        private readonly likeApplication: LikeApplication,
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

        const src = 'spot_likes';
        const outTopic = `${this.targetPrefix}spot_likes`;
        this.logReceiveData(src, key, value);

        // deletes
        if (!value || value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id ?? key ?? ''));
            return;
        }

        //check unpulished state
        if (!(value?.likable_type === 'Kaban\\Models\\Review' && value?.deleted_at == null)) {
            await this.sendTombstone(outTopic, String(value.id));
            return;
        }

        const doc = await this.likeApplication.transformSpotLikeData(value);
        if (!doc) {
            this.logUseCaseEnd(src, false, { reason: 'transformed data is null' });
            return;
        }

        await this.producer.sendMessage(outTopic, String(doc._id), doc);
        this.logUseCaseEnd(src, true, doc);
    }
}
