//AB Test

import { CommentApplication } from 'src/domains/comment/applications/comment.application';

describe('CommentApplication.transformCommentData (isolated, no DB)', () => {
    let svc: CommentApplication;

    beforeEach(() => {
        svc = new CommentApplication();
    });

    it('returns null for null/undefined input', async () => {
        expect(await svc.transformCommentData(null as any)).toBeNull();
        expect(await svc.transformCommentData(undefined as any)).toBeNull();
    });

    it('maps base fields and parses numerics/timestamps (happy path)', async () => {
        const out = await svc.transformCommentData({
            id: 101,
            content: 'hello',
            user_id: '7',
            user_name: 'alice',
            user_email: 'a@example.com',
            user_ip: '127.0.0.1',
            parent_id: '',
            immediate_parent_id: '9',
            replies_count: '3',
            likes_count: 2,
            commentable_id: '55',
            commentable_type: 'Kaban\\Models\\Post',
            created_at: 1_700_000_000,
        });

        expect(out).toEqual({
            _id: 101,
            content: 'hello',

            user: 7,
            userName: 'alice',
            userEmail: 'a@example.com',
            userIp: '127.0.0.1',

            parent: null,
            immediateParent: 9,

            repliesCount: 3,
            likesCount: 2,

            commentableId: 55,
            commentableType: 'post',

            dailytrip: null,
            moment: null,
            post: 55,
            review: null,
            tour: null,
            travelMemory: null,
            travelogue: null,
            video: null,

            createdAt: 1_700_000_000 * 1000, // seconds to ms
        });
    });

    it('parses createdAt from ISO string and returns null for invalid date', async () => {
        const ok = await svc.transformCommentData({
            id: 1,
            created_at: '2024-02-03T10:20:30Z',
            commentable_type: 'Kaban\\Models\\Video',
            commentable_id: 9,
        });
        expect(ok?.createdAt).toBe(new Date('2024-02-03T10:20:30Z').getTime());

        const bad = await svc.transformCommentData({
            id: 2,
            created_at: 'not-a-date',
            commentable_type: 'Kaban\\Models\\Video',
            commentable_id: 9,
        });
        expect(bad?.createdAt).toBeNull();
    });

    it('commentable_type mapping: Video/Review/Dailytrip/Moment/Tour/Travelogue', async () => {
        const types = [
            { t: 'Video', field: 'video' },
            { t: 'Review', field: 'review' },
            { t: 'Dailytrip', field: 'dailytrip' },
            { t: 'Moment', field: 'moment' },
            { t: 'Tour', field: 'tour' },
            { t: 'Travelogue', field: 'travelogue' },
        ] as const;

        for (const { t, field } of types) {
            const out = await svc.transformCommentData({
                id: 10,
                commentable_type: `Kaban\\Models\\${t}`,
                commentable_id: 77,
            });

            // commentableType is the lowercased base type
            expect(out?.commentableType).toBe(t.toLowerCase());
            // specific field should receive the id others should be null
            for (const f of ['dailytrip', 'moment', 'post', 'review', 'tour', 'travelMemory', 'travelogue', 'video'] as const) {
                if (f === field) expect(out?.[f]).toBe(77);
                else expect(out?.[f]).toBeNull();
            }
        }
    });

    it('commentable_type mapping: Travelmemory becomes "travelMemory"', async () => {
        const out = await svc.transformCommentData({
            id: 11,
            commentable_type: 'Kaban\\Models\\Travelmemory',
            commentable_id: '123',
        });

        expect(out?.commentableType).toBe('travelMemory');
        expect(out?.travelMemory).toBe(123);
        expect(out?.post).toBeNull();
    });

    it('commentable_type missing or empty → commentableType null, all targets null', async () => {
        const out = await svc.transformCommentData({
            id: 12,
            commentable_id: 5,
            // commentable_type missing
        });

        expect(out?.commentableType).toBeNull();
        expect(out?.commentableId).toBe(5);
        expect(out?.dailytrip).toBeNull();
        expect(out?.moment).toBeNull();
        expect(out?.post).toBeNull();
        expect(out?.review).toBeNull();
        expect(out?.tour).toBeNull();
        expect(out?.travelMemory).toBeNull();
        expect(out?.travelogue).toBeNull();
        expect(out?.video).toBeNull();
    });

    it('numeric coercion rules: toNum (defaults) and toNumOrNull', async () => {
        const out = await svc.transformCommentData({
            id: 13,
            replies_count: 'not-a-number', // -> 0
            likes_count: undefined,        // -> 0
            user_id: 'x',                  // -> null
            parent_id: null,               // -> null
            immediate_parent_id: '',       // -> null
            commentable_id: 'abc',         // -> null
            commentable_type: 'Kaban\\Models\\Post',
            created_at: '',                // -> null
        });

        expect(out?.repliesCount).toBe(0);
        expect(out?.likesCount).toBe(0);
        expect(out?.user).toBeNull();
        expect(out?.parent).toBeNull();
        expect(out?.immediateParent).toBeNull();
        expect(out?.commentableId).toBeNull();
        expect(out?.createdAt).toBeNull();
    });

    it('keeps user metadata and content nulls if absent', async () => {
        const out = await svc.transformCommentData({
            id: 14,
            commentable_type: 'Kaban\\Models\\Post',
            commentable_id: 1,
        });

        expect(out?.content).toBeNull();
        expect(out?.userName).toBeNull();
        expect(out?.userEmail).toBeNull();
        expect(out?.userIp).toBeNull();
    });

    it('documents current behavior: non-numeric id yields _id=NaN (not null)', async () => {
        const out = await svc.transformCommentData({
            id: 'abc',
            commentable_type: 'Kaban\\Models\\Post',
            commentable_id: 1,
        });

        // NaN is expected with current code
        expect(Number.isNaN(out?._id as any)).toBe(true);
    });
});
