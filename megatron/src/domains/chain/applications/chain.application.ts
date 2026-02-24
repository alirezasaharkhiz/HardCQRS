import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ChainApplication {
    private readonly logger = new Logger(ChainApplication.name);

    async transformSpotChainData(data: any): Promise<any | null> {
        this.logger.debug('ChainApplication.transformSpotChainData()');

        const { id, ...rest } = data || {};
        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toInt = (v: any, d: number | null = null) => {
            if (v === null || v === undefined || v === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };
        const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));

        return {
            _id,
            title: safeStr(rest.title),
            type: toInt(rest.type, null),
        };
    }
}
