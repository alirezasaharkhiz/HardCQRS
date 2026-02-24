import { Injectable, Logger } from '@nestjs/common';
import { AgencySqlRepository } from '../repositories/sql/agency.sql.repository';

@Injectable()
export class AgencyApplication {
  private readonly logger = new Logger(AgencyApplication.name);

  constructor(private agencyRepository: AgencySqlRepository) { }

  async transformAgencyData(data: any): Promise<any | null> {
    this.logger.debug('AgencyApplication.transformAgencyData()');

    const { id } = data || {};

    const toNum = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    const isReviewableEq1 = (v: any) => Number(v) === 1;

    // digits → number[]
    const parseLocationIds = (val: any): number[] => {
      if (val == null) return [];
      const m = String(val).match(/\d+/g);
      return m ? m.map(Number).filter(Number.isFinite) : [];
    };

    // from seconds → 'yyyy-MM-dd HH:mm:ss.SSS'
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    const fmtYmdHmsMsUTC = (ms: number) => {
      const d = new Date(ms);
      return (
        `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
        `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${String(
          d.getUTCMilliseconds()
        ).padStart(3, '0')}`
      );
    };
    const secondEpochToString = (sec: any): string | null => {
      const n = Number(sec);
      if (!Number.isFinite(n)) return null;
      const ms = n < 1e12 ? n * 1000 : n; // tolerate ms too
      return fmtYmdHmsMsUTC(ms);
    };

    const ymdToEpochMs = (s: any): number | null => {
      if (!s) return null;
      const ymd = String(s).slice(0, 10);
      const t = new Date(ymd + 'T00:00:00Z').getTime();
      return Number.isNaN(t) ? null : t;
    };

    const parseWorkingHours = (src: any):
      | Array<{ start: string | null; end: string | null; isClosed: string | null }>
      | null => {
      if (src == null) return null;
      let arr: any[] = [];
      try {
        arr = typeof src === 'string' ? JSON.parse(src) : Array.isArray(src) ? src : [];
      } catch {
        return null;
      }
      const get = (i: number, k: 'start' | 'end' | 'isClosed') =>
        arr?.[i]?.[k] !== undefined ? String(arr[i][k]) : null;

      return Array.from({ length: 7 }, (_, i) => ({
        start: get(i, 'start'),
        end: get(i, 'end'),
        isClosed: get(i, 'isClosed'),
      }));
    };

    const buildCert = (numberVal: any, expVal: any, mediaVal: any) => {
      const number = (numberVal ?? '').toString().trim();
      const expiration = ymdToEpochMs(expVal);
      if (!number || expiration == null) return null;
      return { number, expiration, media: mediaVal ?? null };
    };

    const numeric = typeof id === 'string' ? Number(id) : id;
    const _id = Number.isFinite(numeric) ? Number(numeric) : id;

    const latStr = data?.latitude != null ? String(data.latitude) : null;
    const lonStr = data?.longitude != null ? String(data.longitude) : null;
    const hasGeo =
      latStr !== null &&
      lonStr !== null &&
      latStr !== 'NaN' &&
      lonStr !== 'NaN' &&
      Number.isFinite(Number(latStr)) &&
      Number.isFinite(Number(lonStr));

    const reviewsCount = toNum(data.reviews_count, 0);
    const recCount = toNum(data.recommended_reviews_count, 0);
    const recommendedReviewsPercent =
      reviewsCount !== 0 && recCount !== 0
        ? Math.round((recCount * 10000) / reviewsCount) / 100
        : 0;

    return {
      _id,

      titleFa: data.title_fa ?? null,
      titleEn: data.title_en ?? null,
      slug: data.slug ?? null,
      about: data.about ?? null,
      logo: data.logo_url ?? null,

      location: data.location_id ?? null,
      telephone: data.telephone ?? null,
      fax: data.fax ?? null,
      personnel: toNum(data.personnel, 0),
      addressFa: data.address_fa ?? null,
      addressEn: data.address_en ?? null,
      ceoName: data.ceo_name ?? null,

      averageReviewScore: toNum(data.average_review_score, 0),
      reviewsCount,
      isReviewable: isReviewableEq1(data.is_reviewable),
      recommendedReviewsCount: recCount,
      recommendedReviewsPercent,

      mapZoom: toNum(data.map_zoom, 0),

      createdAt: data.created_at ?? null,
      updatedAt: data.updated_at ?? null,

      locationIds: parseLocationIds(data.location_ids),

      // → 'yyyy-MM-dd HH:mm:ss.SSS'
      validity: secondEpochToString(data.validity),
      subscriptionValidity: secondEpochToString(data.subscription_validity),

      geoLocation: hasGeo
        ? {
          type: 'Point',
          coordinates: [Number(lonStr), Number(latStr)],
        }
        : null,

      workingHours: parseWorkingHours(data.working_hours),

      certA: buildCert(data.cert_a_number, data.cert_a_exp_date, data.cert_a_id),
      certB: buildCert(data.cert_b_number, data.cert_b_exp_date, data.cert_b_id),
      certC: buildCert(data.cert_c_number, data.cert_c_exp_date, data.cert_c_id),
      certD: buildCert(data.cert_d_number, data.cert_d_exp_date, data.cert_d_id),
    };
  }

  async getAgencyById(id: number): Promise<any | null> {
    return this.agencyRepository.findAgencyById(id);
  }
}
