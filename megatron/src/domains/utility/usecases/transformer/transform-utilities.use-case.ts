import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { UtilityApplication } from '../../applications/utility.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('utilities')
export class TransformUtilitiesUseCase extends BaseTransformUseCase {
    constructor(
        private readonly utilityApplication: UtilityApplication,
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

        const outTopic = `${this.targetPrefix}spot_utilities`;
        this.logReceiveData('utilities', key, value);

        // deletes
        if (!value || value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id ?? key ?? ''));
            return;
        }

        // delete unpublished item
        if (!(Number(value?.state) === 1 && value?.deleted_at == null)) {
            await this.sendTombstone(outTopic, String(value.id));
            return;
        }

        const doc = await this.utilityApplication.transformSpotUtilityData(value);
        if (!doc) return;

        await this.producer.sendMessage(outTopic, String(doc._id), doc);
        this.logUseCaseEnd(outTopic, true, doc);
    }
}
