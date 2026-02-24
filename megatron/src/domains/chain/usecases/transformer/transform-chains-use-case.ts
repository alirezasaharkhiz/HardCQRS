import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { ChainApplication } from '../../applications/chain.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';

@Injectable()
@TopicHandler('chains') // db.lastsecondb.chains
export class TransformChainsUseCase extends BaseTransformUseCase {
    constructor(
        private readonly chainApplication: ChainApplication,
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

        const src = 'spot_chains';
        const outTopic = `${this.targetPrefix}spot_chains`;
        this.logReceiveData(src, key, value);

        // deletes
        if (value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id ?? key ?? ''));
            return;
        }

        // check unpublished data
        if (!(Number(value?.state) === 1 && value?.deleted_at == null)) {
            await this.sendTombstone(outTopic, String(value.id));
            return;
        }

        const doc = await this.chainApplication.transformSpotChainData(value);
        if (!doc) {
            this.logUseCaseEnd('chains', false, { "reason": "transformed to null" });
            return;
        }

        await this.producer.sendMessage(outTopic, String(doc._id), doc);
        this.logUseCaseEnd(src, true, doc);
    }
}
