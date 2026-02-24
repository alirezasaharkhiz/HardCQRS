import { Injectable, Logger } from '@nestjs/common';
import { AttractionSqlRepository } from '../repositories/sql/attraction.sql.repository';
import { AttractionAttractionTypeSqlRepository } from '../repositories/sql/attraction-attraction-type.sql.repository';
import { UtilityAttractionSqlRepository } from '../repositories/sql/utility-attraction.sql.repository';
import { SpotRankSqlRepository } from 'src/domains/spot/repositories/sql/spot-rank.sql.repository';

@Injectable()
export class AttractionApplication {
  private readonly logger = new Logger(AttractionApplication.name);

  constructor(
    private readonly attractionRepo: AttractionSqlRepository,
    private readonly attractionTypeRepo: AttractionAttractionTypeSqlRepository,
    private readonly attractionUtilityRepo: UtilityAttractionSqlRepository,
    private readonly spotRankRepo: SpotRankSqlRepository,
  ) { }

  async transformContentAttractionData(data: any): Promise<any | null> {
    this.logger.debug('AttractionApplication.transformAttractionData()');

    const { id, ...rest } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toNum = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const parseIdsFromString = (val: any): number[] => {
      if (val == null) return [];
      const m = String(val).match(/\d+/g);
      return m ? m.map(Number).filter(Number.isFinite) : [];
    };
    const parseArrayMaybeJson = (v: any): number[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v.map(Number).filter(Number.isFinite);
      if (typeof v === 'string') {
        try {
          const arr = JSON.parse(v);
          return Array.isArray(arr) ? arr.map(Number).filter(Number.isFinite) : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    // Prefer joined `types`; fallback to pivot repo
    let types: number[] = parseArrayMaybeJson(rest.types);
    if (types.length === 0) {
      try {
        const rows = await this.attractionTypeRepo.findTypesByAttractionId(_id);
        types = (rows ?? []).map(r => Number(r.id)).filter(Number.isFinite);
      } catch (e: any) {
        this.logger.warn(`types load failed for attraction ${_id}: ${e?.message ?? e}`);
        types = [];
      }
    }
    types = [...new Set(types)];

    return {
      _id,
      titleFa: rest.title_fa ?? null,
      titleEn: rest.title_en ?? null,
      slug: rest.slug ?? null,
      logo: rest.logo_id ?? null,
      about: rest.about ?? null,
      typeIds: parseIdsFromString(rest.type_ids),
      telephone: rest.telephone ?? null,
      location: rest.location_id ?? null,
      averageReviewScore: rest.average_review_score == null ? 0 : Number(rest.average_review_score),
      reviewsCount: toNum(rest.reviews_count, 0),
      recommendedReviewsCount: toNum(rest.recommended_reviews_count, 0),
      addressFa: rest.address_fa ?? null,
      types,
    };
  }

  async transformAttractionTypeData(data: any): Promise<any | null> {
    this.logger.debug('AttractionApplication.transformContentAttractionTypeData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toNum = (v: any): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      _id,
      titleFa: data.title_fa ?? null,
      titleEn: data.title_en ?? null,
      parent: toNum(data.parent_id),
      lft: toNum(data.lft),
      rgt: toNum(data.rgt),
      depth: toNum(data.depth),
    };
  }

  async transformSpotAttractionData(data: any): Promise<any | null> {
    this.logger.debug('AttractionApplication.transformSpotAttractionData()');

    const { id, ...rest } = data || {};
    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toNum = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
    const toFloat = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
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

    const extractIntArray = (txt: any): number[] | null => {
      if (txt == null) return null;
      const m = String(txt).match(/\d+/g);           // <- matches "1","2","442","456","2"
      if (!m) return null;
      const arr = m.map(Number).filter(Number.isFinite);
      return arr.length ? Array.from(new Set(arr)) : null; // dedupe like your pattern
    };
    const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));

    const lat = rest.latitude, lon = rest.longitude;
    const hasGeo =
      lat != null && lon != null && lat !== '' && lon !== '' && lat !== 'NaN' && lon !== 'NaN' &&
      Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));

    let utilities: number[] = parseArrayMaybe(rest.utilities);
    if (utilities.length === 0) {
      try {
        utilities = await this.attractionUtilityRepo.findUtilityIdsByAttractionId(_id);
      } catch (e: any) {
        this.logger.warn(`utilities load failed for attraction ${_id}: ${e?.message ?? e}`);
        utilities = [];
      }
    }
    utilities = [...new Set(utilities)];

    let types: number[];// = parseArrayMaybeJson(rest.types);
    // if (types.length === 0) {
    try {
      const rows = await this.attractionTypeRepo.findTypesByAttractionId(_id);
      types = (rows ?? []).map(r => Number(r.id)).filter(Number.isFinite);
    } catch (e: any) {
      this.logger.warn(`types load failed for attraction ${_id}: ${e?.message ?? e}`);
      types = [];
    }
    // }
    types = [...new Set(types)];

    let ranking = (rest as any).ranking && typeof (rest as any).ranking === 'object'
      ? {
        reviewRank: toNum((rest as any).ranking.reviewRank, null),
        reviewRate: toFloat((rest as any).ranking.reviewRate, null),
        spotsCount: toNum((rest as any).ranking.spotsCount, null),
      }
      : null;

    if (!ranking || (ranking.reviewRank == null && ranking.reviewRate == null && ranking.spotsCount == null)) {
      try {
        const r = await this.spotRankRepo.getSpotRank(_id, 'Kaban\\Models\\Attraction');
        ranking = {
          reviewRank: r?.reviewRank ?? null,
          reviewRate: r?.reviewRate ?? null,
          spotsCount: r?.spotsCount ?? null,
        };
      } catch (e: any) {
        this.logger.warn(`ranking load failed for attraction ${_id}: ${e?.message ?? e}`);
        ranking = { reviewRank: null, reviewRate: null, spotsCount: null };
      }
    }

    const reviewsCount = toNum(rest.reviews_count, 0);
    const recommendedReviewsCount = toNum(rest.recommended_reviews_count, 0);
    const recommendedReviewsPercent =
      reviewsCount && recommendedReviewsCount
        ? Math.round((recommendedReviewsCount * 10000) / reviewsCount) / 100
        : 0;

    return {
      _id,

      titleFa: rest.title_fa ?? null,
      titleEn: rest.title_en ?? null,
      titleExcerptFa: rest.title_excerpt_fa ?? null,
      titleExcerptEn: rest.title_excerpt_en ?? null,
      slug: rest.slug ?? null,
      logo: rest.logo_id ?? null,
      chain: rest.chain_id ?? null,
      about: rest.about ?? null,
      longDescription: rest.long_description ?? null,

      typeIds: extractIntArray(rest.type_ids),
      telephone: rest.telephone ?? null,
      fax: rest.fax ?? null,
      website: rest.website ?? null,
      location: rest.location_id ?? null,
      locationIds: extractIntArray(rest.location_ids),

      geoLocation: hasGeo
        ? { type: 'Point', coordinates: [Number(lon), Number(lat)] }
        : null,

      mapZoom: rest.map_zoom == null ? null : toNum(rest.map_zoom),
      aroundDistance: rest.around_distance == null ? null : toNum(rest.around_distance),

      addressFa: rest.address_fa ?? null,
      addressEn: rest.address_en ?? null,

      isReviewable: Number(rest.is_reviewable) === 1,
      averageReviewScore: toFloat(rest.average_review_score, 0),
      reviewsCount,
      recommendedReviewsCount,
      recommendedReviewsPercent,

      reviewedAt: rest.reviewed_at ?? null,
      likesCount: rest.likes_count == null ? null : toNum(rest.likes_count),
      hits: rest.hits == null ? null : toNum(rest.hits),
      closed: Number(rest.closed) === 1,

      createdAt: rest.created_at ?? null,
      updatedAt: rest.updated_at ?? null,

      utilities: utilities.length ? utilities : null,
      types: types.length ? types : null,

      ranking,
    };
  }

  async transformAttractionAttractionTypeData(data: any): Promise<any | null> {
    this.logger.debug('AttractionApplication.transformAttractionAttractionTypeData()');

    const { attraction_id, __op, __deleted } = data || {};

    const attractionId = Number(attraction_id);

    if (attractionId == null) return null;

    if (__op === 'd' || __deleted === true || __op === 'u' || __op === 'c' || !__op) {
      return { key: String(attractionId), value: { __op: 'u', id: attractionId } };
    }

    return null;
  }

  async getAttractionById(id: number): Promise<any | null> {
    return this.attractionRepo.findAttractionById(id);
  }
}
