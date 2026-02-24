//Black Box Test

import { ConfigService } from '@nestjs/config';
import { TransformCommentsUseCase } from '../../../../src/domains/comment/usecases/transformer/transform-comments.use-case';
import { CommentApplication } from '../../../../src/domains/comment/applications/comment.application';
import { TransformPostsUseCase } from '../../../../src/domains/post/usecases/transformer/transform-posts.use-case';
import { TransformVideosUseCase } from '../../../../src/domains/video/usecases/transformer/transform-videos.use-case';
import { TransformReviewsUseCase } from '../../../../src/domains/review/usecases/transformer/transform-reviews.use-case';
import { KafkaProducerApplication } from '../../../../src/integration/event/drivers/kafka/kafka-producer.application';

describe('TransformCommentsUseCase', () => {
    let transformCommentsUC: TransformCommentsUseCase;

    let commentApplication: jest.Mocked<CommentApplication>;
    let transformPostsUC: jest.Mocked<TransformPostsUseCase>;
    let transformVideosUC: jest.Mocked<TransformVideosUseCase>;
    let transformReviewsUC: jest.Mocked<TransformReviewsUseCase>;
    let producer: jest.Mocked<KafkaProducerApplication>;
    let config: jest.Mocked<ConfigService>;

    beforeEach(() => {
        commentApplication = {
            transformCommentData: jest.fn().mockResolvedValue({ body: 'ok' }),
        } as any;

        // pivot targets (should be called conditionally)
        transformPostsUC = { execute: jest.fn() } as any;
        transformVideosUC = { execute: jest.fn() } as any;
        transformReviewsUC = { execute: jest.fn() } as any;

        producer = {
            sendMessage: jest.fn(),
            sendTombstone: jest.fn(),
        } as any;

        // no prefix
        config = { get: jest.fn().mockReturnValue('') } as any;

        transformCommentsUC = new TransformCommentsUseCase(
            commentApplication,
            transformPostsUC,
            transformVideosUC,
            transformReviewsUC,
            producer,
            config,
        );
    });

    it('sends tombstone on __op=d', async () => {
        await transformCommentsUC.execute('1', { id: 1, __op: 'd' });
        expect(producer.sendTombstone).toHaveBeenCalledWith('comments', '1');
    });

    it('sends tombstone when not published (state/status mismatch)', async () => {
        await transformCommentsUC.execute('2', { id: 2, __op: 'u', state: 0, status: 2 });
        expect(producer.sendTombstone).toHaveBeenCalledWith('comments', '2');
    });

    it('upserts when published', async () => {
        await transformCommentsUC.execute('3', { id: 3, __op: 'u', state: 1, status: 2 });
        expect(producer.sendMessage).toHaveBeenCalledWith(
            'comments',
            3,
            expect.objectContaining({ _id: 3 }),
        );
    });

    it('calls TransformPostsUseCase when commentable_type=Post', async () => {
        await transformCommentsUC.execute('10', {
            id: 10,
            __op: 'u',
            state: 1,
            status: 2,
            commentable_id: 99,
            commentable_type: 'Kaban\\Models\\Post',
        });

        expect(transformPostsUC.execute).toHaveBeenCalledWith('99', {});
        expect(transformVideosUC.execute).not.toHaveBeenCalled();
        expect(transformReviewsUC.execute).not.toHaveBeenCalled();
    });

    it('calls TransformVideosUseCase when commentable_type=Video', async () => {
        await transformCommentsUC.execute('11', {
            id: 11,
            __op: 'u',
            state: 1,
            status: 2,
            commentable_id: 77,
            commentable_type: 'Kaban\\Models\\Video',
        });

        expect(transformVideosUC.execute).toHaveBeenCalledWith('77', {});
        expect(transformPostsUC.execute).not.toHaveBeenCalled();
        expect(transformReviewsUC.execute).not.toHaveBeenCalled();
    });

    it('calls TransformReviewsUseCase when commentable_type=Review', async () => {
        await transformCommentsUC.execute('12', {
            id: 12,
            __op: 'u',
            state: 1,
            status: 2,
            commentable_id: 55,
            commentable_type: 'Kaban\\Models\\Review',
        });

        expect(transformReviewsUC.execute).toHaveBeenCalledWith('55', {});
        expect(transformPostsUC.execute).not.toHaveBeenCalled();
        expect(transformVideosUC.execute).not.toHaveBeenCalled();
    });
});
