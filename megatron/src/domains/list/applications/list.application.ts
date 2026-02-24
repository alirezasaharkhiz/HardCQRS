import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ListApplication {
    private readonly logger = new Logger(ListApplication.name);

    async transformListingData(data: any): Promise<any | null> {
        this.logger.debug('ListApplication.transformListingData()');

        const { id } = data || {};

        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toNum = (v: any): number | null => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };

        const toEpochMs = (v: any): number | null => {
            if (v == null || v === '') return null;
            if (typeof v === 'number') return v < 1e12 ? Math.round(v * 1000) : Math.round(v);
            const s = String(v).trim();
            const n = Number(s);
            if (Number.isFinite(n)) return n < 1e12 ? Math.round(n * 1000) : Math.round(n);
            const t = Date.parse(s);
            return Number.isNaN(t) ? null : t;
        };

        const normalizeType = (t: any): string | null =>
            t == null ? null : String(t).replace(/^Kaban\\Models\\/, '').toLowerCase();

        return {
            _id,
            title: data.title ?? null,
            post: toNum(data.post_id),
            listableType: normalizeType(data.listable_type),
            topDescription: data.top_description ?? null,
            bottomDescription: data.bottom_description ?? null,
            author: toNum(data.author_id),
            authorName: data.author_name ?? null,
            publishedAt: toEpochMs(data.published_at),
            expiredAt: toEpochMs(data.expired_at),
        };
    }

    async transformListableData(data: any): Promise<any | null> {
        this.logger.debug('ListApplication.transformListableData()');

        const { id } = data || {};

        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toNum = (v: any): number | null => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };

        const normalizeType = (t: any): string | null =>
            t == null ? null : String(t).replace(/^Kaban\\Models\\/, '').toLowerCase();

        const listing = toNum(data.listing_id);
        const listableId = toNum(data.listable_id);
        const listableType = normalizeType(data.listable_type);
        const ordering = toNum(data.ordering);

        // Ensure typed fields always exist (null when not the matching type)
        const hotel = listableType === 'hotel' ? listableId : null;
        const restaurant = listableType === 'restaurant' ? listableId : null;
        const attraction = listableType === 'attraction' ? listableId : null;

        return {
            _id,
            listing,
            listableId,
            listableType,
            description: data.description ?? null,
            ordering,
            hotel,
            restaurant,
            attraction,
        };
    }
}
