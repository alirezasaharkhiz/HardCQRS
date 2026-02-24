import { Injectable } from '@nestjs/common';
import { KafkaProducerApplication } from '../../../../integration/event/drivers/kafka/kafka-producer.application';
import { ConfigService } from '@nestjs/config';
import { TopicHandler } from '../../../../integration/event/decorators/topic.decorator';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { AirportApplication } from '../../applications/airport.application';

@Injectable()
@TopicHandler('airports')
export class TransformAirportsUseCase extends BaseTransformUseCase {
    constructor(
        private readonly airportApplication: AirportApplication,
        producer: KafkaProducerApplication,
        config: ConfigService,
    ) {
        super(producer, config);
    }

    async execute(key: string | null, value: any): Promise<void> {
        // ignore snapshot rows
        if (value && typeof value === 'object' && value.__op === 'r') {
            // this.logUseCaseEnd(src, false, { reason: 'snapshot(op=r)' });
            return;
        }

        const src = 'airports';
        const outTopic = `${this.targetPrefix}spot_airports`;
        this.logReceiveData(src, key, value);

        if (!value || value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value?.id));
            return;
        }

        const row = value;

        if (!(Number(row?.state) === 1 && row?.deleted_at == null)) {
            const k = String(row.id ?? value?.id);
            await this.sendTombstone(outTopic, k);
            return;
        }

        const doc = await this.airportApplication.transformAirportData(row);
        if (!doc) {
            this.logUseCaseEnd(outTopic, false, { reason: 'transform returned null' });
            return;
        }

        const msgKey = String(doc._id ?? row.id ?? value?.id);
        await this.producer.sendMessage(outTopic, msgKey, doc);
        this.logUseCaseEnd(outTopic, true, doc);
    }
}
