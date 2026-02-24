import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseTransformUseCase } from '../../../../core/contracts/usecases/transformer/base-transform.use-case';
import { RestaurantApplication } from '../../applications/restaurant.application';
import { KafkaProducerApplication } from 'src/integration/event/drivers/kafka/kafka-producer.application';
import { TopicHandler } from 'src/integration/event/decorators/topic.decorator';

@Injectable()
@TopicHandler('restauranttypes') // db.lastsecondb.restauranttypes
export class TransformRestaurantTypesUseCase extends BaseTransformUseCase {
    constructor(
        private readonly restaurantApplication: RestaurantApplication,
        producer: KafkaProducerApplication,
        config: ConfigService,
    ) {
        super(producer, config);
    }

    async execute(key: string | null, value: any): Promise<void> {
        if (value && typeof value === 'object' && value.__op === 'r') {
            // this.logUseCaseEnd(src, false, { reason: 'snapshot(op=r)' });
            return;
        }

        const outTopic = `${this.targetPrefix}spot_restaurantTypes`;
        this.logReceiveData('restauranttypes', key, value);

        if (!value || value.__op === 'd') {
            await this.sendTombstone(outTopic, String(value.id));
            return;
        }

        if (!(Number(value?.state) === 1 && value?.deleted_at == null)) {
            await this.sendTombstone(outTopic, value.id);
            return;
        }

        const doc = await this.restaurantApplication.transformSpotRestaurantTypeData(value);
        if (!doc) {
            this.logUseCaseEnd('spot_restaurantTypes', false, { reason: 'transform returned null' });
            return;
        }

        const msgKey = String(doc._id);
        await this.producer.sendMessage(outTopic, msgKey, doc);
        this.logUseCaseEnd('spot_restaurantTypes', true, doc);
    }
}
