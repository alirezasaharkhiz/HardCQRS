import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BulletinApplication {
  private readonly logger = new Logger(BulletinApplication.name);

  async transformContentBulletinData(data: any): Promise<any | null> {
    this.logger.debug('BulletinApplication.transformContentBulletinData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toNum = (v: any): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const normalizeType = (t: any): string | null => {
      if (t == null) return null;
      const s = String(t);
      return s.replace(/^Kaban\\Models\\/, '').toLowerCase();
    };

    return {
      _id,
      section: toNum(data.section),
      bulletinableId: toNum(data.bulletinable_id),
      bulletinableType: normalizeType(data.bulletinable_type),

      averageReactionScore: data.average_reaction_score == null ? null : Number(data.average_reaction_score),
      reactionsCount: toNum(data.reactions_count),

      listDescription: data.list_description ?? null,
      canonicalUrl: data.canonical_url ?? null,
      redirectUrl: data.redirect_url ?? null,
      responseCode: data.response_code ?? null,
      shouldRedirect: toNum(data.should_redirect),

      meta: {
        title: data.meta_title ?? null,
        description: data.meta_description ?? null,
        keywords: data.meta_keywords ?? null,
      },
    };
  }

  async transformSpotBulletinData(data: any): Promise<any | null> {
    this.logger.debug('BulletinApplication.transformSpotBulletinData()');

    const { id, ...rest } = data || {};
    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toInt = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const toFloat = (v: any): number | null => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));
    const normalizeType = (s: any) => {
      const raw = safeStr(s);
      return raw ? raw.replace('Kaban\\Models\\', '').toLowerCase() : null;
    };

    return {
      _id,

      section: toInt(rest.section),
      bulletinableId: toInt(rest.bulletinable_id),
      bulletinableType: normalizeType(rest.bulletinable_type),

      averageReactionScore: toFloat(rest.average_reaction_score),
      reactionsCount: toInt(rest.reactions_count),

      listDescription: safeStr(rest.list_description),
      canonicalUrl: safeStr(rest.canonical_url),
      mosaferanListDescription: safeStr(rest.mosaferan_list_description),
      mosaferanCanonicalUrl: safeStr(rest.mosaferan_canonical_url),

      redirectUrl: safeStr(rest.redirect_url),

      responseCode: rest.response_code != null && String(rest.response_code) !== ''
        ? toInt(rest.response_code)
        : null,

      shouldRedirect: Number(rest.should_redirect) === 1,

      meta: {
        title: safeStr(rest.meta_title),
        description: safeStr(rest.meta_description),
        keywords: safeStr(rest.meta_keywords),
      },

      mosaferanMeta: {
        title: safeStr(rest.mosaferan_meta_title),
        description: safeStr(rest.mosaferan_meta_description),
        keywords: safeStr(rest.mosaferan_meta_keywords),
      },
    };
  }
}
