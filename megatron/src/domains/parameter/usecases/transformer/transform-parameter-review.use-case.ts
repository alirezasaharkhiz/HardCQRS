import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { ParameterApplication } from '../../applications/parameter.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';

@Injectable()
@TopicHandler('parameter_review') // db.lastsecondb.parameter_review
export class TransformParameterReviewUseCase extends BaseTransformUseCase {
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

        const outTopic = `${this.targetPrefix}spot_parameterReview`;
        this.logReceiveData('parameter_review', key, value);

        // deletes
        if (value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id ?? key ?? ''));
            return;
        }

        //no filtering logic for now

        const doc = await this.parameterApplication.transformSpotParameterReviewData(value);
        if (!doc) {
            this.logUseCaseEnd('spot_parameterReview', false, { "reason": "trasnformed data is null" });
            return
        }

        await this.producer.sendMessage(outTopic, String(doc._id), doc);
        this.logUseCaseEnd('spot_parameterReview', true, doc);
    }
}
