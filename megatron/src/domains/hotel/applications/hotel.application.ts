import { Injectable, Logger } from '@nestjs/common';
import { HotelSqlRepository } from '../repositories/sql/hotel.sql.repository';
import { SpotRankSqlRepository } from 'src/domains/spot/repositories/sql/spot-rank.sql.repository';

@Injectable()
export class HotelApplication {
  private readonly logger = new Logger(HotelApplication.name);

  constructor(
    private hotelRepository: HotelSqlRepository,
    private readonly spotRankRepository: SpotRankSqlRepository,
  ) { }

  async transformHotelData(data: any): Promise<any | null> {
    this.logger.debug('HotelApplication.transformHotelData()');

    const { id, amenity_ids, ...rest } = data || {};

    const toNum = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const toBoolEq1 = (v: any): boolean => v === 1 || v === '1';

    const parseLocationIds = (val: any): number[] => {
      if (Array.isArray(val)) return val.map(Number).filter(Number.isFinite);
      if (val == null) return [];
      const m = String(val).match(/\d+/g);
      return m ? m.map(Number).filter(Number.isFinite) : [];
    };

    const parseArrayMaybeJson = (v: any): any[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try {
          const arr = JSON.parse(v);
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    const numeric = typeof id === 'string' ? Number(id) : id;
    const hotelId = typeof numeric === 'number' && !Number.isNaN(numeric) ? numeric : Number(id);
    const _id = Number.isFinite(hotelId) ? hotelId : id;

    const latitudeStr = rest?.latitude != null ? String(rest.latitude) : null;
    const longitudeStr = rest?.longitude != null ? String(rest.longitude) : null;
    const hasValidGeo =
      latitudeStr !== null &&
      longitudeStr !== null &&
      latitudeStr !== 'NaN' &&
      longitudeStr !== 'NaN' &&
      Number.isFinite(Number(latitudeStr)) &&
      Number.isFinite(Number(longitudeStr));

    let amenities: number[] = [];
    if (rest.amenities) {
      amenities = parseArrayMaybeJson(rest.amenities).map(Number).filter(Number.isFinite);
    } else if (Array.isArray(amenity_ids)) {
      amenities = amenity_ids.map(Number).filter(Number.isFinite);
    } else {
      try {
        const result = await this.hotelRepository.findAmenitiesByHotelId(Number(hotelId));
        amenities = (result ?? []).map((a: any) => Number(a.id)).filter(Number.isFinite);
      } catch (e: any) {
        this.logger.warn(`amenities load failed for hotel ${hotelId}: ${e?.message ?? e}`);
        amenities = [];
      }
    }
    amenities = [...new Set(amenities)];

    let ranking = {
      reviewRank: 0,
      reviewRate: 0,
      spotsCount: 0,
    };
    try {
      const dbRank = await this.spotRankRepository.getSpotRank(Number(hotelId), 'Kaban\\Models\\Hotel');
      if (dbRank) {
        ranking = {
          reviewRank: dbRank.reviewRank == null ? 0 : toNum(dbRank.reviewRank),
          reviewRate: dbRank.reviewRate == null ? 0 : Number(dbRank.reviewRate),
          spotsCount: dbRank.spotsCount == null ? 0 : toNum(dbRank.spotsCount),
        };
      } else if (rest.ranking && typeof rest.ranking === 'object') {
        ranking = {
          reviewRank: rest.ranking.reviewRank == null ? 0 : toNum(rest.ranking.reviewRank),
          reviewRate: rest.ranking.reviewRate == null ? 0 : Number(rest.ranking.reviewRate),
          spotsCount: rest.ranking.spotsCount == null ? 0 : toNum(rest.ranking.spotsCount),
        };
      } else {
        ranking = {
          reviewRank: rest.review_rank == null ? 0 : toNum(rest.review_rank),
          reviewRate: rest.review_rate == null ? 0 : Number(rest.review_rate),
          spotsCount: rest.spots_count == null ? 0 : toNum(rest.spots_count),
        };
      }
    } catch (e: any) {
      this.logger.warn(`rank load failed for hotel ${hotelId}: ${e?.message ?? e}`);
    }

    const reviewsCount = toNum(rest.reviews_count, 0);
    const recommendedReviewsCount = toNum(rest.recommended_reviews_count, 0);
    const recommendedReviewsPercent =
      reviewsCount !== 0 && recommendedReviewsCount !== 0
        ? Math.round((recommendedReviewsCount * 10000) / reviewsCount) / 100
        : 0;

    const rebuildDate =
      rest.rebuild_date != null && String(rest.rebuild_date).trim() !== ''
        ? String(rest.rebuild_date)
        : null;

    return {
      _id,

      titleFa: rest.title_fa ?? null,
      titleEn: rest.title_en ?? null,
      titleExcerptFa: rest.title_excerpt_fa ?? null,
      titleExcerptEn: rest.title_excerpt_en ?? null,
      slug: rest.slug ?? null,
      aka: rest.aka ?? null,

      logo: rest.logo_id ?? null,
      chain: rest.chain_id ?? null,

      about: rest.about ?? null,
      longDescription: rest.long_description ?? null,

      grade: rest.grade == null ? null : (Number.isFinite(Number(rest.grade)) ? Number(rest.grade) : rest.grade),
      rooms: rest.rooms == null ? null : toNum(rest.rooms),
      telephone: rest.telephone ?? null,
      fax: rest.fax ?? null,
      website: rest.website ?? null,

      location: rest.location_id ?? null,
      locationIds: parseLocationIds(rest.location_ids),
      geoLocation: hasValidGeo
        ? {
          type: 'Point',
          coordinates: [Number(longitudeStr), Number(latitudeStr)],
        }
        : null,
      mapZoom: rest.map_zoom == null ? null : toNum(rest.map_zoom),
      aroundDistance: rest.around_distance == null ? null : toNum(rest.around_distance),

      addressFa: rest.address_fa ?? null,
      addressEn: rest.address_en ?? null,

      isReviewable: toBoolEq1(rest.is_reviewable),
      averageReviewScore: rest.average_review_score == null ? 0 : Number(rest.average_review_score),
      reviewsCount,
      recommendedReviewsCount,
      recommendedReviewsPercent,

      reviewedAt: rest.reviewed_at ?? null,
      likesCount: rest.likes_count == null ? 0 : toNum(rest.likes_count, 0),
      hits: rest.hits == null ? 0 : toNum(rest.hits, 0),

      closed: toBoolEq1(rest.closed),

      oldHotel: rest.old_hotel_id ?? null,
      newHotel: rest.new_hotel_id ?? null,
      rebuildDate,

      createdAt: rest.created_at ?? null,
      updatedAt: rest.updated_at ?? null,

      amenities,

      ranking,
    };
  }

  async transformContentHotelData(data: any): Promise<any | null> {
    this.logger.debug('HotelApplication.transformContentHotelData()');
    const { id } = data || {};

    const _idNum = Number(id);
    const _id = Number.isFinite(_idNum) ? _idNum : id;
    if (!Number.isFinite(Number(_id))) return null;

    const toNum = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const parseArrayMaybeJson = (v: any): any[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    let amenities: number[] = [];
    try {
      if (data.amenities != null) {
        const arr = parseArrayMaybeJson(data.amenities);
        amenities = arr.map((x: any) => Number(x)).filter(Number.isFinite);
      } else {
        const rows = await this.hotelRepository.findAmenitiesByHotelId(Number(_id));
        amenities = (rows ?? []).map((a: any) => Number(a.id)).filter(Number.isFinite);
      }
    } catch (e: any) {
      this.logger.warn(`amenities hydrate failed for hotel ${_id}: ${e?.message ?? e}`);
      amenities = [];
    }
    // de-duplicate
    amenities = [...new Set(amenities)];

    return {
      _id,
      titleFa: data.title_fa ?? null,
      titleEn: data.title_en ?? null,
      slug: data.slug ?? null,
      logo: data.logo_id ?? null,
      about: data.about ?? null,
      telephone: data.telephone ?? null,
      location: data.location_id ?? null,
      averageReviewScore: data.average_review_score == null ? 0 : Number(data.average_review_score),
      reviewsCount: toNum(data.reviews_count, 0),
      recommendedReviewsCount: toNum(data.recommended_reviews_count, 0),
      reviewedAt: data.reviewed_at ?? null,
      addressFa: data.address_fa ?? null,
      amenities,
    };
  }

  async transformSpotHotelData(data: any): Promise<any | null> {
    if (!data) return null;

    const toInt = (v: any, d = 0) => {
      const n = parseInt(String(v ?? ''), 10);
      return Number.isFinite(n) ? n : d;
    };
    const parseArrayMaybeJson = (v: any): any[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
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

    const lat = data?.latitude;
    const lon = data?.longitude;
    const hasGeo =
      lat != null && lon != null && lat !== '' && lon !== '' && lat !== 'NaN' && lon !== 'NaN' &&
      !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lon));

    const _id = toInt(data.id);
    if (!_id) return null;


    const rank = await this.spotRankRepository.getSpotRank(_id, 'Kaban\\Models\\Hotel');

    let amenities: number[] = [];
    try {
      if (data.amenities != null) {
        const arr = parseArrayMaybeJson(data.amenities);
        amenities = arr.map((x: any) => Number(x)).filter(Number.isFinite);
      } else {
        const rows = await this.hotelRepository.findAmenitiesByHotelId(Number(_id));
        amenities = (rows ?? []).map((a: any) => Number(a.id)).filter(Number.isFinite);
      }
    } catch (e: any) {
      this.logger.warn(`amenities hydrate failed for hotel ${_id}: ${e?.message ?? e}`);
      amenities = [];
    }
    // de-duplicate
    amenities = [...new Set(amenities)];

    return {
      _id,
      titleFa: safeStr(data.title_fa),
      titleEn: safeStr(data.title_en),
      titleExcerptFa: safeStr(data.title_excerpt_fa),
      titleExcerptEn: safeStr(data.title_excerpt_en),
      slug: safeStr(data.slug),
      aka: safeStr(data.aka),
      logo: data.logo_id != null ? toInt(data.logo_id) : null,
      chain: data.chain_id != null ? toInt(data.chain_id) : null,
      about: safeStr(data.about),
      longDescription: safeStr(data.long_description),
      grade: data.grade != null ? toInt(data.grade) : null,
      rooms: data.rooms != null ? toInt(data.rooms) : null,
      telephone: safeStr(data.telephone),
      fax: safeStr(data.fax),
      website: safeStr(data.website),
      location: data.location_id != null ? toInt(data.location_id) : null,
      locationIds: extractIntArray(data.location_ids),
      geoLocation: hasGeo ? { type: 'Point', coordinates: [Number(lon), Number(lat)] } : null,
      mapZoom: data.map_zoom != null ? toInt(data.map_zoom) : null,
      aroundDistance: data.around_distance != null ? toInt(data.around_distance) : null,
      addressFa: safeStr(data.address_fa),
      addressEn: safeStr(data.address_en),
      isReviewable: Number(data.is_reviewable) === 1,
      averageReviewScore: toFloat(data.average_review_score, 0),
      reviewsCount: data.reviews_count != null ? toInt(data.reviews_count) : 0,
      recommendedReviewsCount: data.recommended_reviews_count != null ? toInt(data.recommended_reviews_count) : 0,
      recommendedReviewsPercent:
        toInt(data.reviews_count, 0) !== 0 && toInt(data.recommended_reviews_count, 0) !== 0
          ? Math.round(((toInt(data.recommended_reviews_count, 0) * 100) / toInt(data.reviews_count, 0)) * 100) / 100
          : 0,
      reviewedAt: safeStr(data.reviewed_at),
      likesCount: data.likes_count != null ? toInt(data.likes_count) : null,
      hits: data.hits != null ? toInt(data.hits) : null,
      closed: Number(data.closed) === 1,
      oldHotel: data.old_hotel_id != null ? toInt(data.old_hotel_id) : null,
      newHotel: data.new_hotel_id != null ? toInt(data.new_hotel_id) : null,
      rebuildDate: safeStr(data.rebuild_date) ? safeStr(data.rebuild_date) : null,
      createdAt: safeStr(data.created_at),
      updatedAt: safeStr(data.updated_at),
      amenities,
      ranking: {
        reviewRank: rank?.reviewRank ?? null,
        reviewRate: rank?.reviewRate ?? null,
        spotsCount: rank?.spotsCount ?? null,
      },
    };
  }

  async getHotelById(id: number) { return this.hotelRepository.findHotelById(id); }
}
