import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { MediaApplication } from '../../applications/media.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('mediables')
export class TransformMediablesUseCase extends BaseTransformUseCase {
    constructor(
        private readonly mediaApplication: MediaApplication,
        producer: KafkaProducerApplication,
        config: ConfigService,
    ) {
        super(producer, config);
    }

    async execute(key: string | null, value: any): Promise<void> {
        // ignore snapshot silently
        if (value?.__op === 'r') {
            return;
        }

        const src = 'mediables';
        const outTopic = `${this.targetPrefix}spot_mediables`;
        this.logReceiveData(src, key, value);

        // deletes
        if (!value || value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id ?? key ?? ''));
            return;
        }

        // no filter logic

        const doc = await this.mediaApplication.transformSpotMediableData(value);
        if (!doc) {
            this.logUseCaseEnd('spot_mediables', false, { reason: 'transformed data is null' });
            return;
        }

        await this.producer.sendMessage(outTopic, String(doc._id), doc);
        this.logUseCaseEnd('spot_mediables', true, doc);
    }
}
