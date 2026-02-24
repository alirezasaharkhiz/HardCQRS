import { Injectable, Logger } from '@nestjs/common';
import { VideoSqlRepository } from '../repositories/sql/video.sql.repository';
import { LocationVideoSqlRepository } from '../repositories/sql/location-video.sql.repository';
import { CommentSqlRepository } from 'src/domains/comment/repositories/sql/comment.sql.repository';

@Injectable()
export class VideoApplication {
    private readonly logger = new Logger(VideoApplication.name);

    constructor(
        private readonly videoRepository: VideoSqlRepository,
        private readonly locationVideoSqlRepository: LocationVideoSqlRepository,
        private readonly commentRepository: CommentSqlRepository,
    ) { }

    async transformVideoData(data: any): Promise<any | null> {
        this.logger.debug('VideoApplication.transformVideoData()');

        const { id, ...rest } = data || {};

        const videoId = Number(id);
        if (!videoId || Number.isNaN(videoId)) return null;

        const toNum = (v: any, d = 0) => {
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };

        const parseIds = (val?: string): number[] =>
            !val ? [] : val.split('-').filter(Boolean).map(Number).filter(Number.isFinite);

        const toEpochMs = (v: any): number | null => {
            if (v == null || v === '') return null;
            if (typeof v === 'number') return v < 1e12 ? Math.round(v * 1000) : Math.round(v);
            const s = String(v).trim();
            const n = Number(s);
            if (Number.isFinite(n)) return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
            const t = Date.parse(s);
            return Number.isNaN(t) ? null : t;
        };

        let locations: number[] = [];
        if (Array.isArray(rest.locations) && rest.locations.length > 0) {
            locations = rest.locations.map((x: any) => Number(x)).filter(Number.isFinite);
        } else {
            try {
                const rows = await this.locationVideoSqlRepository.findLocationsByVideoId(videoId);
                locations = (rows ?? []).map((r: any) => Number(r.location_id)).filter(Number.isFinite);
            } catch (e: any) {
                this.logger.warn(`locations load failed for video ${videoId}: ${e?.message ?? e}`);
                locations = [];
            }
        }

        const commentsCount = await this.commentRepository.getCountOfActiveComments(
            data.id,
            'Kaban\\Models\\Video',
        );

        return {
            _id: videoId,

            title: rest.title ?? null,
            content: rest.content ?? null,
            slug: rest.slug ?? null,
            aparatKey: rest.aparat_key ?? null,
            rssTitle: rest.rss_title ?? null,
            duration: rest.duration ?? null,

            authorId: rest.author_id ?? null,
            authorName: rest.author_name ?? null,

            status: rest.status ?? null,
            videoLink: rest.video_link ?? null,
            image: rest.image_id ?? null,
            cover: rest.cover ?? null,

            locationIds: parseIds(rest.location_ids),
            labels: parseIds(rest.label_ids),
            locations,

            featured: rest.is_featured === 1,
            hits: toNum(rest.hits, 0),
            commentsCount,
            downloadsCount: toNum(rest.downloads_count, 0),
            reactionsCount: toNum(rest.reactions_count, 0),
            averageReactionScore: Number(rest.average_reaction_score ?? 0),

            publishedAt: toEpochMs(rest.published_at),
            calculatedDate: toEpochMs(rest.calculated_date),

            manualUpdatedAt: rest.manual_updated_at ?? null,
            updatedAt: rest.updated_at ?? null,
        };
    }

    async getVideoById(id: number) {
        return this.videoRepository.findById(id);
    }

    async transformVideoQualityData(data: any): Promise<any | null> {
        this.logger.debug('VideoApplication.transformVideoQualityData()');

        const { id } = data || {};

        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        return {
            _id,
            video: Number(data.video_id) ?? null,
            type: Number(data.quality_id) ?? null,
            url: data.url ?? null,
            autoplay: data.auto_play === 1 || data.auto_play === '1',
        };
    }
}
