import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UtilityApplication {
    private readonly logger = new Logger(UtilityApplication.name);

    async transformSpotUtilityData(data: any): Promise<any | null> {
        this.logger.debug('UtilityApplication.transformSpotUtilityData()');

        const { id, ...rest } = data || {};
        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toInt = (v: any, d = 0) => {
            const n = parseInt(String(v ?? ''), 10);
            return Number.isFinite(n) ? n : d;
        };
        const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));

        return {
            _id,
            title: safeStr(rest.name),
            type: rest.type != null ? toInt(rest.type) : null,
        };
    }
}
