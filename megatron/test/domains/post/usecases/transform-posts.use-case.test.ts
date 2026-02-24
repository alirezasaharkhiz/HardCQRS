//Black Box Test

import { ConfigService } from '@nestjs/config';
import { PostApplication } from '../../../../src/domains/post/applications/post.application';
import { TransformPostsUseCase } from '../../../../src/domains/post/usecases/transformer/transform-posts.use-case';
import { KafkaProducerApplication } from '../../../../src/integration/event/drivers/kafka/kafka-producer.application';

describe('TransformPostsUseCase', () => {
    let transformPostsUC: TransformPostsUseCase;

    let postApplication: jest.Mocked<PostApplication>;
    let producer: jest.Mocked<KafkaProducerApplication>;
    let config: jest.Mocked<ConfigService>;

    beforeEach(() => {
        postApplication = {
            getPostById: jest.fn(),
            transformPostData: jest.fn(),
        } as any;

        producer = {
            sendMessage: jest.fn(),
            sendTombstone: jest.fn(),
        } as any;

        // no prefix
        config = { get: jest.fn().mockReturnValue('') } as any;

        transformPostsUC = new TransformPostsUseCase(postApplication, producer, config);
    });

    it('ignores snapshot (__op=r)', async () => {
        await transformPostsUC.execute('1', { id: 1, __op: 'r' });
        expect(producer.sendMessage).not.toHaveBeenCalled();
        expect(producer.sendTombstone).not.toHaveBeenCalled();
    });

    it('sends tombstone on delete (__op=d)', async () => {
        await transformPostsUC.execute('2', { id: 2, __op: 'd' });
        expect(producer.sendTombstone).toHaveBeenCalledWith('posts', '2');
    });

    it('fetches full row when payload is sparse and upserts', async () => {
        postApplication.getPostById.mockResolvedValueOnce({ id: 5, state: 1, deleted_at: null });
        postApplication.transformPostData.mockResolvedValueOnce({ _id: 5, title: 'ok' });

        await transformPostsUC.execute('5', { __op: 'u', id: 5 });

        expect(postApplication.getPostById).toHaveBeenCalledWith(5);
        expect(postApplication.transformPostData).toHaveBeenCalledWith({ id: 5, state: 1, deleted_at: null });
        expect(producer.sendMessage).toHaveBeenCalledWith(
            'posts',
            '5',
            expect.objectContaining({ _id: 5 }),
        );
    });

    it('sends tombstone if deleted_at present', async () => {
        postApplication.getPostById.mockResolvedValueOnce({ id: 7, state: 1, deleted_at: 'x' });

        await transformPostsUC.execute('7', { __op: 'u', id: 7 });

        expect(producer.sendTombstone).toHaveBeenCalledWith('posts', '7');
    });

    it('upserts when published and transformed ok', async () => {
        postApplication.transformPostData.mockResolvedValueOnce({ _id: 8, title: 'A' });

        await transformPostsUC.execute('8', { id: 8, __op: 'u', state: 1, deleted_at: null });

        expect(producer.sendMessage).toHaveBeenCalledWith(
            'posts',
            '8',
            expect.objectContaining({ _id: 8 }),
        );
    });

    it('does not upsert if transform returns null', async () => {
        postApplication.transformPostData.mockResolvedValueOnce(null);

        await transformPostsUC.execute('9', { id: 9, __op: 'u', state: 1 });

        expect(producer.sendMessage).not.toHaveBeenCalled();
    });
});
