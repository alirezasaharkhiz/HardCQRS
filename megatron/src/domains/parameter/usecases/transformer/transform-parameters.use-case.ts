import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { ParameterApplication } from '../../applications/parameter.application';

@Injectable()
@TopicHandler('parameters') // db.lastsecondb.parameter
export class TransformParametersUseCase extends BaseTransformUseCase {
    constructor(
        private readonly parameterApplication: ParameterApplication,
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

        const outTopic = `${this.targetPrefix}spot_parameters`;
        this.logReceiveData('parameters', key, value);

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
                this.logUseCaseEnd('parameters', false);
                return;
            }
            payload = await this.parameterApplication.getReviewById(lookupId);
            if (!payload) {
                this.logUseCaseEnd('parameters', false);
                return;
            }
        }

        // detect unpublished data
        if (!(Number(payload?.state) === 1 && payload?.deleted_at == null)) {
            await this.sendTombstone(outTopic, String(payload.id));
            return;
        }

        const doc = await this.parameterApplication.transformSpotParameterData(payload);
        if (!doc) {
            this.logUseCaseEnd('spot_parameters', false, { "reason": "trasnformed data is null" });
            return
        }

        await this.producer.sendMessage(outTopic, String(doc._id), doc);
        this.logUseCaseEnd('spot_parameters', true, doc);
    }
}
