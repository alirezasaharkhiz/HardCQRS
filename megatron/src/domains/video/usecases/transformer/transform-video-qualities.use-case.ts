import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { VideoApplication } from '../../applications/video.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('video_qualities')
export class TransformVideoQualitiesUseCase extends BaseTransformUseCase {
    constructor(
        private readonly videoApplication: VideoApplication,
        producer: KafkaProducerApplication,
        config: ConfigService,
    ) {
        super(producer, config);
    }

    async execute(key: string | null, value: any): Promise<void> {
        // skip Debezium snapshot events
        if (
            value &&
            typeof value === 'object' &&
            Object.prototype.hasOwnProperty.call(value, '__op') &&
            value.__op === 'r'
        ) {
            // this.logUseCaseEnd('video_qualities', false, { reason: 'snapshot(op=r)' });
            return;
        }

        this.logReceiveData('video_qualities', key, value);

        if (!value) {
            this.logUseCaseEnd('video_qualities', false);
            return;
        }

        const outTopic = `${this.targetPrefix}content_videoQualities`;

        if (
            value &&
            typeof value === 'object' &&
            Object.prototype.hasOwnProperty.call(value, '__op') &&
            value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value.id));
            return;
        }

        const transformed = await this.videoApplication.transformVideoQualityData(value);

        if (!transformed) {
            this.logUseCaseEnd(outTopic, false);
            return;
        }

        await this.producer.sendMessage(outTopic, String(key ?? transformed._id), transformed);
        this.logUseCaseEnd(outTopic, true, transformed);
    }
}
