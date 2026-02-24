import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { FeatureApplication } from '../../applications/feature.application';

@Injectable()
@TopicHandler('features') // db.lastsecondb.features
export class TransformFeaturesUseCase extends BaseTransformUseCase {
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

        const src = 'features';
        const outTopic = `${this.targetPrefix}spot_features`;
        this.logReceiveData(src, key, value);

        // deletes
        if (!value || value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id ?? key ?? ''));
            return;
        }

        // check unpublished item
        if (!(Number(value?.state) === 1 && value?.deleted_at == null)) {
            await this.sendTombstone(outTopic, String(value.id));
            return;
        }

        const doc = await this.featureApplication.transformSpotFeatureData(value);
        if (!doc) {
            this.logUseCaseEnd('features', false, { "reason": "trasnformed data is null" });
            return
        }

        await this.producer.sendMessage(outTopic, String(doc._id), doc);
        this.logUseCaseEnd(outTopic, true, doc);
    }
}
