import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LikeApplication {
    private readonly logger = new Logger(LikeApplication.name);

    async transformSpotLikeData(data: any): Promise<any | null> {
        this.logger.debug('LikeApplication.transformSpotLikeData()');

        const { id, ...rest } = data || {};
        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toInt = (v: any, d: number | null = null) => {
            if (v === null || v === undefined || v === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };
        const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));
        const normalizeKabanType = (s: any) => {
            const raw = safeStr(s);
            return raw ? raw.replace('Kaban\\Models\\', '').toLowerCase() : null;
        };

        return {
            _id,
            user: toInt(rest.user_id, null),
            userIp: safeStr(rest.user_ip),
            likableId: toInt(rest.likable_id, null),
            likableType: normalizeKabanType(rest.likable_type),
        };
    }
}
