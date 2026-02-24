import { Injectable, Logger } from '@nestjs/common';
import { LocationParameterSqlRepository } from '../repositories/sql/location-parameter.sql.repository';
import { ParameterSqlRepository } from '../repositories/sql/parameter.sql.repository';

@Injectable()
export class ParameterApplication {
    private readonly logger = new Logger(ParameterApplication.name);
    constructor(
        private readonly locationParamRepo: LocationParameterSqlRepository,
        private readonly parameterSqlRepository: ParameterSqlRepository
    ) { }

    async transformSpotParameterData(data: any): Promise<any | null> {
        this.logger.debug('ParameterApplication.transformSpotParameterData()');

        const { id, ...rest } = data || {};
        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toInt = (v: any, d: number | null = null) => {
            if (v === null || v === undefined || v === '') return d;
            const n = Number(v);
            return Number.isFinite(n) ? n : d;
        };
        const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));
        const parseArrayMaybe = (v: any): number[] => {
            if (!v) return [];
            if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
            if (typeof v === 'string') {
                try {
                    const arr = JSON.parse(v);
                    return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
                } catch {
                    return v.split(',').map((x: string) => Number(x.trim())).filter(Number.isFinite);
                }
            }
            return [];
        };

        let locations: number[] = parseArrayMaybe((rest as any).locations);
        if (locations.length === 0) {
            try {
                locations = await this.locationParamRepo.findLocationIdsByParameterId(_id);
            } catch (e: any) {
                this.logger.warn(`locations load failed for parameter ${_id}: ${e?.message ?? e}`);
                locations = [];
            }
        }
        locations = [...new Set(locations)];

        return {
            _id,
            title: safeStr(rest.title),
            type: toInt(rest.type, null),
            mode: toInt(rest.mode, null),
            locations: locations.length ? locations : null,
        };
    }

    async getReviewById(id: number) {
        return this.parameterSqlRepository.findParameteryId(id);
    }

    async transformSpotParameterReviewData(data: any): Promise<any | null> {
        this.logger.debug('ParameterApplication.transformSpotParameterReviewData()');

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
            parameter: toInt(rest.parameter_id, null),
            score: toInt(rest.score, null),
        };
    }
}
