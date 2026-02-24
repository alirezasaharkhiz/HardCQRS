import { Injectable, Logger } from '@nestjs/common';
import { SpotRankSqlRepository } from 'src/domains/spot/repositories/sql/spot-rank.sql.repository';
import { LocationSqlRepository } from '../repositories/sql/location.sql.repository';


@Injectable()
export class LocationApplication {
  private readonly logger = new Logger(LocationApplication.name);

  constructor(
    private readonly spotRankRepo: SpotRankSqlRepository,
    private readonly locationRepo: LocationSqlRepository
  ) { }

  async transformContentLocationData(data: any): Promise<any | null> {
    this.logger.debug('LocationApplication.transformContentLocationData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const rawImage = data.image_id;
    const image =
      rawImage != null && Number(rawImage) !== 0 ? Number(rawImage) : null;

    return {
      _id,
      titleFa: data.title_fa ?? null,
      titleEn: data.title_en ?? null,
      slugEn: data.slug ?? null,
      slugFa: data.slug_fa ?? null,
      type: Number(data.type ?? 0),
      parent: data.parent_id ?? null,
      left: Number(data.lft ?? 0),
      right: Number(data.rgt ?? 0),
      depth: Number(data.depth ?? 0),
      country: data.country_id ?? null,
      image,
      travelogueMeta: {
        title: data.travelogue_title ?? null,
        description: data.travelogue_description ?? null,
        keywords: data.travelogue_keywords ?? null,
      },
    };
  }

  async transformSpotLocationData(row: any): Promise<any | null> {
    this.logger.debug('LocationApplication.transformSpotLocationData()');

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
    const lower = (s: any) => {
      const v = safeStr(s);
      return v == null ? null : v.toLowerCase();
    };
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

    const rank = await this.spotRankRepo.getSpotRank(_id, 'Kaban\\Models\\Location');

    return {
      _id,
      titleFa: safeStr(row.title_fa),
      titleEn: safeStr(row.title_en),
      slugEn: safeStr(row.slug),
      slugFa: safeStr(row.slug_fa),
      imageId: row.image_id != null ? toInt(row.image_id) : null,
      type: row.type != null ? toInt(row.type) : null,
      parent: row.parent_id != null ? toInt(row.parent_id) : null,
      lft: row.lft != null ? toInt(row.lft) : null,
      rgt: row.rgt != null ? toInt(row.rgt) : null,
      description: safeStr(row.description),
      longDescription: safeStr(row.long_description),
      geoLocation: hasGeo ? { type: 'Point', coordinates: [Number(lon), Number(lat)] } : null,
      mapZoom: row.map_zoom != null ? toInt(row.map_zoom) : null,
      depth: row.depth != null ? toInt(row.depth) : null,
      country: row.country_id != null ? toInt(row.country_id) : null,
      promotionPrice: row.promotion_price != null ? toInt(row.promotion_price) : null,
      iataCode: lower(row.iata_code),
      aroundDistance: safeStr(row.around_distance),
      averageReviewScore: toFloat(row.average_review_score, 0),
      isReviewable: Number(row.is_reviewable) === 1,
      reviewsCount: row.reviews_count != null ? toInt(row.reviews_count) : 0,
      recommendedReviewsCount: row.recommended_reviews_count != null ? toInt(row.recommended_reviews_count) : 0,
      recommendedReviewsPercent:
        toInt(row.reviews_count, 0) !== 0 && toInt(row.recommended_reviews_count, 0) !== 0
          ? Math.round(((toInt(row.recommended_reviews_count, 0) * 100) / toInt(row.reviews_count, 0)) * 100) / 100
          : 0,
      aroundHotels: extractIntArray(row.around_hotel_ids),
      aroundRestaurants: extractIntArray(row.around_restaurant_ids),
      aroundAttractions: extractIntArray(row.around_attraction_ids),
      hotelMeta: {
        title: safeStr(row.hotel_title),
        description: safeStr(row.hotel_description),
        keywords: safeStr(row.hotel_keywords),
      },
      restaurantMeta: {
        title: safeStr(row.restaurant_title),
        description: safeStr(row.restaurant_description),
        keywords: safeStr(row.restaurant_keywords),
      },
      ranking: {
        reviewRank: rank?.reviewRank ?? null,
        reviewRate: rank?.reviewRate ?? null,
        spotsCount: rank?.spotsCount ?? null,
      },
      attractionMeta: {
        title: safeStr(row.attraction_title),
        description: safeStr(row.attraction_description),
        keywords: safeStr(row.attraction_keywords),
      },
    };
  }

  async getLocationById(id: number) {
    return this.locationRepo.findLocationById(id);
  }
}