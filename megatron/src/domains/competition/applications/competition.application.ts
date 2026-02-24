import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CompetitionApplication {
  private readonly logger = new Logger(CompetitionApplication.name);

  async transformCompetitionData(data: any): Promise<any | null> {
    this.logger.debug('CompetitionApplication.transformCompetitionData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      title: data.title ?? null,
    };
  }

    async transformCompeteData(data: any): Promise<any | null> {
        this.logger.debug('CompetitionApplication.transformCompeteData()');

        const { id } = data || {};

        const _id = Number(id);
        if (!Number.isFinite(_id)) return null;

        const toNum = (v: any): number | null => {
            const n = Number(v);
            return Number.isFinite(n) ? n : null;
        };

        const normalizeType = (t: any): string | null => {
            if (t == null) return null;
            return String(t).replace('Kaban\\Models\\', '').toLowerCase();
        };

        return {
            _id,
            competition: toNum(data.competition_id),
            competitorId: toNum(data.competitor_id),
            competitorType: normalizeType(data.competitor_type),
        };
    }
}
