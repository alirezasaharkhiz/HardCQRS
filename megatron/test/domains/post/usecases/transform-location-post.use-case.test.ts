//Black Box Test

import { ConfigService } from '@nestjs/config';
import { TransformLocationPostUseCase } from '../../../../src/domains/post/usecases/transformer/transform-location-post.use-case';
import { TransformPostsUseCase } from '../../../../src/domains/post/usecases/transformer/transform-posts.use-case';
import { KafkaProducerApplication } from '../../../../src/integration/event/drivers/kafka/kafka-producer.application';

describe('TransformLocationPostUseCase', () => {
    let transformLocationPostUC: TransformLocationPostUseCase;

    let postsUC: jest.Mocked<TransformPostsUseCase>;
    let producer: jest.Mocked<KafkaProducerApplication>;
    let config: jest.Mocked<ConfigService>;

    beforeEach(() => {
        postsUC = { execute: jest.fn() } as any;

        producer = {
            sendMessage: jest.fn(),
            sendTombstone: jest.fn(),
        } as any;

        config = { get: jest.fn().mockReturnValue('') } as any;

        transformLocationPostUC = new TransformLocationPostUseCase(postsUC, producer, config);
    });

    it('ignores snapshot (__op=r)', async () => {
        await transformLocationPostUC.execute('1', { __op: 'r', post_id: 42 });
        expect(postsUC.execute).not.toHaveBeenCalled();
    });

    it('does nothing when value is null/undefined', async () => {
        await transformLocationPostUC.execute('1', null as any);
        await transformLocationPostUC.execute('1', undefined as any);
        expect(postsUC.execute).not.toHaveBeenCalled();
    });

    it('does nothing when post_id is missing or null', async () => {
        await transformLocationPostUC.execute('1', { __op: 'u' });
        await transformLocationPostUC.execute('1', { __op: 'u', post_id: null });
        expect(postsUC.execute).not.toHaveBeenCalled();
    });

    it('calls TransformPostsUseCase.execute when post_id is present (op=u)', async () => {
        await transformLocationPostUC.execute('k', { __op: 'u', post_id: 77 });
        expect(postsUC.execute).toHaveBeenCalledTimes(1);
        expect(postsUC.execute).toHaveBeenCalledWith(77, { __op: 'u', id: 77 });
    });

    it('calls TransformPostsUseCase.execute for other ops too (op=c)', async () => {
        await transformLocationPostUC.execute('k', { __op: 'c', post_id: 88 });
        expect(postsUC.execute).toHaveBeenCalledWith(88, { __op: 'u', id: 88 });
    });

    it('calls TransformPostsUseCase.execute even on delete (op=d)', async () => {
        await transformLocationPostUC.execute('k', { __op: 'd', post_id: 99 });
        expect(postsUC.execute).toHaveBeenCalledWith(99, { __op: 'u', id: 99 });
    });
});
