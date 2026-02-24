import { Injectable, Logger } from '@nestjs/common';
import { ReviewSqlRepository } from '../repositories/sql/review.sql.repository';
import { CommentSqlRepository } from 'src/domains/comment/repositories/sql/comment.sql.repository';

@Injectable()
export class ReviewApplication {
    constructor(
        private readonly reviewSqlRepository: ReviewSqlRepository,
        private readonly commentSqlRepository: CommentSqlRepository,
    ) { }

    private readonly logger = new Logger(ReviewApplication.name);

    async transformSpotReviewData(data: any): Promise<any | null> {
        this.logger.debug('ReviewApplication.transformSpotReviewData()');

        const { id, ...rest } = data || {};
        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toInt = (v: any, d: number | null = null) => {
            if (v === null || v === undefined || v === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };
        const toFloat = (v: any, d: number | null = null) => {
            if (v === null || v === undefined || v === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? parseFloat(n.toFixed(2)) : d;
        };

        const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));
        const extractIntArray = (txt: any): number[] | null => {
            if (txt == null) return null;
            const m = String(txt).match(/\d+/g);
            if (!m) return null;
            const arr = m.map(Number).filter(Number.isFinite);
            return arr.length ? arr : null;
        };
        const normalizeType = (s: any) => {
            const raw = safeStr(s);
            return raw ? raw.replace('Kaban\\Models\\', '').toLowerCase() : null;
        };

        const reviewableTypeRaw = safeStr(rest.reviewable_type) || '';
        const isType = (klass: string) => reviewableTypeRaw === klass;

        let referrer = 0;
        if (rest.referer != null) {
            try {
                const obj = typeof rest.referer === 'string' ? JSON.parse(rest.referer) : rest.referer;
                const t = Number(obj?.type);
                referrer = Number.isFinite(t) ? t : 0;
            } catch {
                referrer = 0;
            }
        }

        const commentsCount = await this.commentSqlRepository.getCountOfActiveComments(
            data.id,
            'Kaban\\Models\\Review',
        );

        return {
            _id,

            title: safeStr(rest.title),
            slug: safeStr(rest.slug),
            content: safeStr(rest.content),

            user: toInt(rest.user_id, null),
            travelCategory: toInt(rest.travel_category, null),

            reviewableType: normalizeType(rest.reviewable_type),

            agency: isType('Kaban\\Models\\Agency') ? toInt(rest.reviewable_id, null) : null,
            hotel: isType('Kaban\\Models\\Hotel') ? toInt(rest.reviewable_id, null) : null,
            restaurant: isType('Kaban\\Models\\Restaurant') ? toInt(rest.reviewable_id, null) : null,
            attraction: isType('Kaban\\Models\\Attraction') ? toInt(rest.reviewable_id, null) : null,
            location: isType('Kaban\\Models\\Location') ? toInt(rest.reviewable_id, null) : null,

            reviewable: toInt(rest.reviewable_id, null),

            travelYear: toInt(rest.travel_year, null),
            travelPeriod: toInt(rest.travel_period, null),

            locationIds: extractIntArray(rest.location_ids),

            mainReply: toInt(rest.main_reply, null),

            isRecommended: Number(rest.is_recommended) === 1,

            overallFeeling: toInt(rest.overall_feeling, null),

            certificationApproved: Number(rest.certification_status) === 2,

            averageScore: toFloat(rest.average_score, null),

            mealType: toInt(rest.meal_type, null),
            priceRange: toInt(rest.price_range, null),
            visitDuration: toInt(rest.visit_duration, null),

            likesCount: toInt(rest.likes_count, null),
            commentsCount,

            referrer,

            hits: toInt(rest.hits, null),

            createdAt: safeStr(rest.created_at),
            updatedAt: safeStr(rest.updated_at),
        };
    }

    async getReviewById(id: number) {

        return this.reviewSqlRepository.findReviewyId(id);
    }
}
