import { Injectable, Logger } from '@nestjs/common';
import { FacilityRestaurantSqlRepository } from '../repositories/sql/facility-restaurant.sql.repository';
import { RestaurantRestaurantTypeSqlRepository } from '../repositories/sql/restaurant-restaurant-type.sql.repository';
import { SpotRankSqlRepository } from 'src/domains/spot/repositories/sql/spot-rank.sql.repository';
import { RestaurantSqlRepository } from '../repositories/sql/restaurant.sql.repository';

@Injectable()
export class RestaurantApplication {
  private readonly logger = new Logger(RestaurantApplication.name);

  constructor(
    private readonly facilityRestaurantRepository: FacilityRestaurantSqlRepository,
    private readonly restaurantRestaurantTypeRepository: RestaurantRestaurantTypeSqlRepository,
    private readonly spotRankRepository: SpotRankSqlRepository,
    private readonly restaurantRepository: RestaurantSqlRepository,

  ) { }

  async transformContentRestaurantData(data: any): Promise<any | null> {
    this.logger.debug('RestaurantApplication.transformContentRestaurantData()');

    const { id, ...rest } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toNum = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
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

    let facilities: number[] = parseArrayMaybe(rest.facilities);
    if (facilities.length === 0) {
      try {
        facilities = await this.facilityRestaurantRepository.findFacilityIdsByRestaurantId(_id);
      } catch (e: any) {
        this.logger.warn(`facilities load failed for restaurant ${_id}: ${e?.message ?? e}`);
        facilities = [];
      }
    }
    facilities = [...new Set(facilities)];

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
      slug: rest.slug ?? null,
      logo: rest.logo_id ?? null,
      about: rest.about ?? null,
      addressFa: rest.address_fa ?? null,
      telephone: rest.telephone ?? null,
      location: rest.location_id ?? null,

      averageReviewScore: rest.average_review_score == null ? 0 : Number(rest.average_review_score),
      reviewsCount,
      recommendedReviewsCount,
      recommendedReviewsPercent,

      facilities,
    };
  }

  async transformSpotRestaurantData(row: any): Promise<any | null> {
    if (!row) return null;

    const toInt = (v: any, d = 0) => {
      const n = parseInt(String(v ?? ''), 10);
      return Number.isFinite(n) ? n : d;
    };
    const toFloat = (v: any, d = 0) => {
      const n = parseFloat(String(v ?? ''));
      return Number.isFinite(n) ? n : d;
    };
    const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));
    const extractIntArray = (txt: any): number[] | null => {
      if (txt == null) return null;
      const m = String(txt).match(/\d+/g);
      if (!m) return null;
      const arr = m.map(x => parseInt(x, 10)).filter(Number.isFinite);
      return arr.length ? arr : null;
    };

    const lat = row?.latitude;
    const lon = row?.longitude;
    const hasGeo =
      lat != null && lon != null && lat !== '' && lon !== '' && lat !== 'NaN' && lon !== 'NaN' &&
      !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lon));

    const _id = toInt(row.id);
    if (!_id) return null;

    // ---------- facilities (fallback-first, like your snippet) ----------
    let facilities: number[] = Array.isArray((row as any).facilities)
      ? (row as any).facilities.map((n: any) => Number(n)).filter(Number.isFinite)
      : [];
    if (facilities.length === 0) {
      try {
        facilities = await this.facilityRestaurantRepository.findFacilityIdsByRestaurantId(_id);
      } catch (e: any) {
        this.logger.warn(`facilities load failed for restaurant ${_id}: ${e?.message ?? e}`);
        facilities = [];
      }
    }
    facilities = [...new Set(facilities)];


    let types: number[] = Array.isArray((row as any).types)
      ? (row as any).types.map((n: any) => Number(n)).filter(Number.isFinite)
      : [];
    if (types.length === 0) {
      try {
        types = await this.restaurantRestaurantTypeRepository.findTypesByRestaurantId(_id);
      } catch (e: any) {
        this.logger.warn(`types load failed for restaurant ${_id}: ${e?.message ?? e}`);
        types = [];
      }
    }
    types = [...new Set(types)];

    let ranking = (row as any).ranking && typeof (row as any).ranking === 'object'
      ? {
        reviewRank: Number((row as any).ranking.reviewRank ?? null) || null,
        reviewRate: Number((row as any).ranking.reviewRate ?? null) || null,
        spotsCount: Number((row as any).ranking.spotsCount ?? null) || null,
      }
      : null;

    if (!ranking || (ranking.reviewRank == null && ranking.reviewRate == null && ranking.spotsCount == null)) {
      try {
        const r = await this.spotRankRepository.getSpotRank(_id, 'Kaban\\Models\\Restaurant');
        ranking = {
          reviewRank: r?.reviewRank ?? 0,
          reviewRate: r?.reviewRate ?? 0,
          spotsCount: r?.spotsCount ?? 0,
        };
      } catch (e: any) {
        this.logger.warn(`ranking load failed for restaurant ${_id}: ${e?.message ?? e}`);
        ranking = { reviewRank: 0, reviewRate: 0, spotsCount: 0 };
      }
    }

    return {
      _id,
      titleFa: safeStr(row.title_fa),
      titleEn: safeStr(row.title_en),
      titleExcerptFa: safeStr(row.title_excerpt_fa),
      titleExcerptEn: safeStr(row.title_excerpt_en),
      slug: safeStr(row.slug),
      logo: row.logo_id != null ? toInt(row.logo_id) : null,
      chain: row.chain_id != null ? toInt(row.chain_id) : null,
      about: safeStr(row.about),
      longDescription: safeStr(row.long_description),
      typeIds: extractIntArray(row.type_ids),
      priceRange: row.price_range != null ? toInt(row.price_range) : null,
      mealTypes: extractIntArray(row.meal_types),
      telephone: safeStr(row.telephone),
      fax: safeStr(row.fax),
      website: safeStr(row.website),
      location: row.location_id != null ? toInt(row.location_id) : null,
      locationIds: extractIntArray(row.location_ids),
      geoLocation: hasGeo ? { type: 'Point', coordinates: [Number(lon), Number(lat)] } : null,
      mapZoom: row.map_zoom != null ? toInt(row.map_zoom) : null,
      aroundDistance: row.around_distance != null ? toInt(row.around_distance) : null,
      addressFa: safeStr(row.address_fa),
      addressEn: safeStr(row.address_en),
      isReviewable: Number(row.is_reviewable) === 1,
      averageReviewScore: toFloat(row.average_review_score, 0),
      reviewsCount: row.reviews_count != null ? toInt(row.reviews_count) : 0,
      recommendedReviewsCount: row.recommended_reviews_count != null ? toInt(row.recommended_reviews_count) : 0,
      recommendedReviewsPercent:
        toInt(row.reviews_count, 0) !== 0 && toInt(row.recommended_reviews_count, 0) !== 0
          ? Math.round(((toInt(row.recommended_reviews_count, 0) * 100) / toInt(row.reviews_count, 0)) * 100) / 100
          : 0,
      reviewedAt: safeStr(row.reviewed_at),
      averageReviewPriceRange: toFloat(row.average_price_range, 0),
      likesCount: row.likes_count != null ? toInt(row.likes_count) : null,
      hits: row.hits != null ? toInt(row.hits) : null,
      closed: Number(row.closed) === 1,
      createdAt: safeStr(row.created_at),
      updatedAt: safeStr(row.updated_at),
      facilities: facilities.length ? facilities : [],
      types: types.length ? types : [],
      ranking,
    };
  }

  async transformSpotRestaurantTypeData(row: any): Promise<any | null> {
    if (!row) return null;

    const toInt = (v: any, d = 0) => {
      const n = parseInt(String(v ?? ''), 10);
      return Number.isFinite(n) ? n : d;
    };
    const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));

    const _id = Number.isFinite(Number(row.id))
      ? Number(row.id)
      : (Number.isFinite(Number(row.ROWKEY)) ? Number(row.ROWKEY) : null);

    return {
      _id,
      titleFa: safeStr(row.title_fa),
      titleEn: safeStr(row.title_en),
      parent: row.parent_id != null ? toInt(row.parent_id) : null,
      lft: row.lft != null ? toInt(row.lft) : null,
      rgt: row.rgt != null ? toInt(row.rgt) : null,
      depth: row.depth != null ? toInt(row.depth) : null,
    };
  }


  async getRestaurantById(id: number) { return this.restaurantRepository.findRestaurantById(id); }
}
