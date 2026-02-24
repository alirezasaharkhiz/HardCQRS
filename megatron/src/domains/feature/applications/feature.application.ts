import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FeatureApplication {
    private readonly logger = new Logger(FeatureApplication.name);

    async transformSpotFeatureData(data: any): Promise<any | null> {
        this.logger.debug('FeatureApplication.transformSpotFeatureData()');

        const { id, ...rest } = data || {};
        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));

        return {
            _id,
            name: safeStr(rest.name),
            title: safeStr(rest.title),
            description: safeStr(rest.description),
            icon: safeStr(rest.icon_class),
        };
    }

    async transformSpotFeatureLocationData(data: any): Promise<any | null> {
        this.logger.debug('FeatureApplication.transformSpotFeatureLocationData()');

        const { id, ...rest } = data || {};
        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toInt = (v: any, d: number | null = null) => {
            if (v === null || v === undefined || v === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };

        return {
            _id,
            location: toInt(rest.location_id, null),
            feature: toInt(rest.feature_id, null),
            reviewsCount: toInt(rest.reviews_count, null),
            provedCount: toInt(rest.proved_count, null),
        };
    }

    async transformSpotFeatureReviewData(data: any): Promise<any | null> {
        this.logger.debug('FeatureApplication.transformSpotFeatureReviewData()');

        const { id, ...rest } = data || {};
        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toInt = (v: any, d: number | null = null) => {
            if (v === null || v === undefined || v === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };

        return {
            _id,
            review: toInt(rest.review_id, null),
            feature: toInt(rest.feature_id, null),
            status: Number(rest.status) === 1,
        };
    }
}
