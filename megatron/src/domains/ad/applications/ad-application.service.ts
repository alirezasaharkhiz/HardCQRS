import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AdApplication {
  private readonly logger = new Logger(AdApplication.name);

  async transformTextAdData(data: any): Promise<any | null> {
    this.logger.debug('TextAdService.transformTextAdData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toNum = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const parseIds = (val?: string): number[] => {
      if (!val) return [];
      return String(val)
        .split('-')
        .filter(Boolean)
        .map((s) => Number(s))
        .filter(Number.isFinite);
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

    return {
      _id,

      title: data.title ?? null,
      link: data.link ?? null,
      position: data.position ?? null,

      location: data.location_id ?? null,
      locationIds: parseIds(data.location_ids),

      hits: toNum(data.hits, 0),
      views: toNum(data.views, 0),
      clicks: toNum(data.clicks, 0),

      startDate: toEpochMs(data.start_date) == 0 ? null : toEpochMs(data.start_date),
      endDate: toEpochMs(data.end_date) == 0 ? null : toEpochMs(data.end_date),

      featured: toNum(data.featured, 0),
      rel: data.rel ?? null,
      target: data.target ?? null,
      state: toNum(data.state, 0),
    };
  }

}
