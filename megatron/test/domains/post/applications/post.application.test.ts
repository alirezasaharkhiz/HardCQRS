
//AB Test

import { PostApplication } from 'src/domains/post/applications/post.application';

describe('PostApplication.transformPostData (isolated, no DB)', () => {
    let postRepository: any;
    let commentRepository: any;
    let locationPostRepository: any;
    let svc: PostApplication;

    beforeEach(() => {
        postRepository = {
            // note: your code calls findPostyId (typo in repo name assumed)
            findPostyId: jest.fn(),
        };
        commentRepository = {
            getCountOfActiveComments: jest.fn().mockResolvedValue(0),
        };
        locationPostRepository = {
            findByPostId: jest.fn().mockResolvedValue([]),
        };

        svc = new PostApplication(postRepository, commentRepository, locationPostRepository);
    });

    it('returns null for invalid data: missing data or invalid id', async () => {
        expect(await svc.transformPostData(null as any)).toBeNull();
        expect(await svc.transformPostData(undefined as any)).toBeNull();
        expect(await svc.transformPostData({} as any)).toBeNull();         // no id
        expect(await svc.transformPostData({ id: 'abc' } as any)).toBeNull(); // NaN id
    });

    it('transforms with full, mixed-type input (happy path)', async () => {
        commentRepository.getCountOfActiveComments.mockResolvedValueOnce(7);
        // repository returns some location rows; will be used for `locations`
        locationPostRepository.findByPostId.mockResolvedValueOnce([
            { location_id: 101 },
            { locationId: '102' },
            { id: 103 },
            103,
            'bad',
        ]);

        const input = {
            id: 55,
            title: 'Hello',
            rss_title: 'RSS Hello',
            slug: 'hello-world',
            content: '<p>hi</p>',

            category_id: 9,
            author_id: 77,
            author_name: 'Alice',
            image_id: 222,
            hotel_id: 333,
            video_id: 444,

            // comma/space/words mixed — should extract digits
            location_ids: 'Locs: 1, 2 and 3',
            category_ids: 'cats 10|11|||12',
            tag_ids: 't: 5,7,7,99',

            published_at: 1_700_000_000,
            calculated_date: '2024-02-03T10:20:30Z',
            pinned_at: '2024-02-01',

            featured: 1,
            keywords: 'a,b,c',
            description: 'desc',
            hits: '42', // string → number
            likes_count: 3,
            reactions_count: '9',
            average_reaction_score: '4.5',

            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-06-01T12:34:56Z',
            manual_updated_at: '2023-12-31',

            state: 1,
            deleted_at: null,
        };

        const out = await svc.transformPostData(input);

        // basic identity and mapping
        expect(out?._id).toBe(55);
        expect(out?.title).toBe('Hello');
        expect(out?.rssTitle).toBe('RSS Hello');
        expect(out?.slug).toBe('hello-world');
        expect(out?.content).toBe('<p>hi</p>');

        expect(out?.category).toBe(9);
        expect(out?.author).toBe(77);
        expect(out?.authorName).toBe('Alice');
        expect(out?.image).toBe(222);
        expect(out?.hotel).toBe(333);
        expect(out?.video).toBe(444);

        // parsed arrays
        expect(out?.locationIds).toEqual([1, 2, 3]);
        expect(out?.categoryIds).toEqual([10, 11, 12]);
        expect(out?.tagIds).toEqual([5, 7, 7, 99]); // tagIds keeps duplicates then null if empty (checked below)

        // parsed timestamps/dates
        expect(out?.publishedAt).toBe(1_700_000_000 * 1000); // seconds -> ms
        expect(typeof out?.calculatedDate).toBe('number');
        expect(out?.calculatedDate).toBe(new Date('2024-02-03T10:20:30Z').getTime());

        expect(out?.pinnedAt instanceof Date).toBe(true);
        expect(out?.pinnedAt?.toISOString().startsWith('2024-02-01')).toBe(true);

        // booleans & numerics
        expect(out?.featured).toBe(true);
        expect(out?.keywords).toBe('a,b,c');
        expect(out?.description).toBe('desc');
        expect(out?.hits).toBe(42);
        expect(out?.likesCount).toBe(3);
        expect(out?.commentsCount).toBe(7);
        expect(out?.reactionsCount).toBe(9);
        expect(out?.averageReactionScore).toBe(4.5);

        // created/updated dates
        expect(out?.createdAt?.toISOString()).toBe('2023-01-01T00:00:00.000Z');
        expect(out?.updatedAt?.toISOString()).toBe('2023-06-01T12:34:56.000Z');
        expect(out?.manualUpdatedAt?.toISOString().startsWith('2023-12-31')).toBe(true);

        // state
        expect(out?.state).toBe(1);

        // hydrated locations (from repo, deduped + numeric only)
        expect(out?.locations).toEqual([101, 102, 103]);
    });

    it('location hydrate falls back to parsing data.location_ids when repository throws', async () => {
        commentRepository.getCountOfActiveComments.mockResolvedValueOnce(1);
        locationPostRepository.findByPostId.mockRejectedValueOnce(new Error('boom'));

        const input = { id: 12, location_ids: 'x 9 and 9 and 2', state: 1 };
        const out = await svc.transformPostData(input);

        // falls back to parseIdsDigits(data.location_ids), deduped
        expect(out?.locations).toEqual([9, 2]);
    });

    it('tagIds becomes null when no digits in tag_ids', async () => {
        const input = { id: 77, tag_ids: 'no-digits-here', state: 1 };
        const out = await svc.transformPostData(input);
        expect(out?.tagIds).toBeNull();
    });

    it('date/timestamp parsing edge cases', async () => {
        const input = {
            id: 88,
            // invalid values should become null
            published_at: 'not-a-date',
            calculated_date: '',
            pinned_at: 'invalid-date',
            created_at: undefined,
            updated_at: null,
            manual_updated_at: '2024-13-99', // invalid
            state: 1,
        };
        const out = await svc.transformPostData(input);
        expect(out?.publishedAt).toBeNull();
        expect(out?.calculatedDate).toBeNull();
        expect(out?.pinnedAt).toBeNull();
        expect(out?.createdAt).toBeNull();
        expect(out?.updatedAt).toBeNull();
        expect(out?.manualUpdatedAt).toBeNull();
    });

    it('featured true for 1/true; false otherwise', async () => {
        let out = await svc.transformPostData({ id: 1, featured: 1, state: 1 });
        expect(out?.featured).toBe(true);

        out = await svc.transformPostData({ id: 2, featured: true, state: 1 });
        expect(out?.featured).toBe(true);

        out = await svc.transformPostData({ id: 3, featured: 0, state: 1 });
        expect(out?.featured).toBe(false);

        out = await svc.transformPostData({ id: 4, state: 1 });
        expect(out?.featured).toBe(false);
    });

    it('numeric fields default to 0 when missing/invalid', async () => {
        const out = await svc.transformPostData({
            id: 99,
            hits: undefined,
            likes_count: undefined,
            reactions_count: undefined,
            average_reaction_score: undefined,
            state: 1,
        });

        expect(out?.hits).toBe(0);
        expect(out?.likesCount).toBe(0);
        expect(out?.reactionsCount).toBe(0);
        expect(out?.averageReactionScore).toBe(0);
    });
});

describe('PostApplication.getPostById', () => {
    let postRepository: any;
    let commentRepository: any;
    let locationPostRepository: any;
    let svc: PostApplication;

    beforeEach(() => {
        postRepository = { findPostyId: jest.fn().mockResolvedValue({ id: 5 }) };
        commentRepository = { getCountOfActiveComments: jest.fn() };
        locationPostRepository = { findByPostId: jest.fn() };
        svc = new PostApplication(postRepository, commentRepository, locationPostRepository);
    });

    it('delegates to postRepository.findPostyId', async () => {
        const res = await svc.getPostById(5);
        expect(postRepository.findPostyId).toHaveBeenCalledWith(5);
        expect(res).toEqual({ id: 5 });
    });
});
