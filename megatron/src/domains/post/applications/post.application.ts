// src/applications/post.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PostSqlRepository } from '../repositories/sql/post.sql.repository';
import { CommentSqlRepository } from 'src/domains/comment/repositories/sql/comment.sql.repository';
import { LocationPostSqlRepository } from '../repositories/sql/location-post.sql.repository';

@Injectable()
export class PostApplication {
    private readonly logger = new Logger(PostApplication.name);

    constructor(
        private readonly postRepository: PostSqlRepository,
        private readonly commentRepository: CommentSqlRepository,
        private readonly locationPostRepository: LocationPostSqlRepository,
    ) { }

    async transformPostData(data: any): Promise<any | null> {
        this.logger.debug('PostApplication.transformPostData()');

        const { id } = data || {};

        const postId = Number(id);
        if (!postId || Number.isNaN(postId)) return null;
        if (!data) return null;

        const parseIdsDigits = (src?: string): number[] => {
            if (!src) return [];
            const m = String(src).match(/\d+/g);
            return m ? m.map((s) => Number(s)).filter(Number.isFinite) : [];
        };
        const parseDate = (val?: any): Date | null => {
            if (!val) return null;
            const d = new Date(val);
            return Number.isNaN(d.getTime()) ? null : d;
        };
        const parseTimestamp = (val?: any): number | null => {
            if (val === null || val === undefined || val === '') return null;
            const n = Number(val);
            if (Number.isFinite(n)) {
                const ms = n < 1e12 ? n * 1000 : n;
                return ms;
            }
            const d = new Date(val);
            const t = d.getTime();
            return Number.isNaN(t) ? null : t;
        };

        const commentsCount = await this.commentRepository.getCountOfActiveComments(
            data.id,
            'Kaban\\Models\\Post',
        );

        let locations: number[] = [];
        try {
            const repoRows = await this.locationPostRepository.findByPostId(postId);
            const repoIds = Array.isArray(repoRows)
                ? repoRows
                    .map((row: any) =>
                        Number(
                            row?.location_id ?? row?.locationId ?? row?.id ?? row
                        )
                    )
                    .filter(Number.isFinite)
                : [];

            if (repoIds.length) {
                locations = repoIds;
            }
        } catch (e: any) {
            this.logger.warn(`locations hydrate failed for post ${postId}: ${e?.message ?? e}`);
            locations = parseIdsDigits(data.location_ids);
        }
        // dedupe
        locations = [...new Set(locations)];

        const tagIdsParsed = parseIdsDigits(data.tag_ids);
        const tagIds = tagIdsParsed.length ? tagIdsParsed : null;

        return {
            _id: data.id,

            title: data.title ?? null,
            rssTitle: data.rss_title ?? null,
            slug: data.slug ?? null,
            content: data.content ?? null,

            category: data.category_id ?? null,
            author: data.author_id ?? null,
            authorName: data.author_name ?? null,
            image: data.image_id ?? null,
            hotel: data.hotel_id ?? null,
            video: data.video_id ?? null,

            locationIds: parseIdsDigits(data.location_ids),
            categoryIds: parseIdsDigits(data.category_ids),
            tagIds,

            publishedAt: parseTimestamp(data.published_at),
            calculatedDate: parseTimestamp(data.calculated_date),
            pinnedAt: parseDate(data.pinned_at),

            featured: data.featured === 1 || data.featured === true,
            keywords: data.keywords ?? null,
            description: data.description ?? null,
            hits: Number(data.hits ?? 0),
            likesCount: Number(data.likes_count ?? 0),
            commentsCount,
            reactionsCount: Number(data.reactions_count ?? 0),
            averageReactionScore: Number(data.average_reaction_score ?? 0),

            createdAt: parseDate(data.created_at),
            updatedAt: parseDate(data.updated_at),
            manualUpdatedAt: parseDate(data.manual_updated_at),

            state: data.state ?? 0,

            locations,
        };
    }


    async getPostById(id: number) {
        return this.postRepository.findPostyId(id);
    }
}
