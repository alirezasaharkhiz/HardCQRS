import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MediaApplication {
  private readonly logger = new Logger(MediaApplication.name);

  async transformMediaData(data: any): Promise<any | null> {
    this.logger.debug('MediaApplication.transformMediaData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      title: data.title ?? null,
      description: data.description ?? null,
      url: data.url ?? null,
      ordering: Number(data.ordering ?? 0),
      isApproved: data.approved_at != null,
    };
  }

  async transformSpotMediableData(data: any): Promise<any | null> {
    this.logger.debug('MediableService.transformSpotMediableData()');

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

    // SPLIT(REGEXP_REPLACE(tags, '[\\[\\]\\"\\s]', ''), ',')
    const parseTags = (v: any): string[] | null => {
      if (v == null) return null;
      const cleaned = String(v).replace(/[\[\]\\"\s]/g, '');
      if (cleaned === '') return null;
      const arr = cleaned.split(',').filter(t => t !== '');
      return arr.length ? arr : null;
    };

    let reviewCategory: number | null = null;
    let reviewableTypeFromData: string | null = null;
    let reviewable: number | null = null;
    let review: number | null = null;
    if (rest.data != null) {
      try {
        const obj = typeof rest.data === 'string' ? JSON.parse(rest.data) : rest.data;
        reviewCategory = toInt(obj?.category_id, null);
        reviewableTypeFromData = safeStr(obj?.reviewable_type);
        reviewable = toInt(obj?.reviewable_id, null);
        review = toInt(obj?.review_id, null);
      } catch {
        // leave as nulls
      }
    }

    return {
      _id,
      media: toInt(rest.media_id, null),
      mediable: toInt(rest.mediable_id, null),
      mediableType: normalizeKabanType(rest.mediable_type),
      album: safeStr(rest.album),
      tags: parseTags(rest.tags),
      reviewCategory,
      reviewableType: reviewableTypeFromData,
      reviewable,
      review,
    };
  }
}
