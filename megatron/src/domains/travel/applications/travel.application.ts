import { Injectable, Logger } from '@nestjs/common';
import { TravelogueSqlRepository } from '../repositories/sql/travelogue.sql.repository';
import { LocationTravelogueSqlRepository } from '../repositories/sql/location-travelogue.sql.repository';

@Injectable()
export class TravelApplication {
  constructor(
    private readonly travelogueRepository: TravelogueSqlRepository,
    private readonly locationTravelogueSqlRepository: LocationTravelogueSqlRepository
  ) { }
  private readonly logger = new Logger(TravelApplication.name);

  async transformTravelogueData(data: any): Promise<any | null> {
    this.logger.debug('TravelApplication.transformTravelogueData()');

    const { id, type } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toTimestamp = (v: any): number | null => {
      if (!v) return null;
      const n = Number(v);
      if (Number.isFinite(n)) return n;
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d.getTime();
    };

    let locations: number[] = [];
    if (Array.isArray(data.locations) && data.locations.length > 0) {
      locations = data.locations.map((x: any) => Number(x)).filter(Number.isFinite);
    } else {
      try {
        const rows = await this.locationTravelogueSqlRepository.findLocationsByTravelogueId(_id);
        locations = (rows ?? []).map((r: any) => Number(r.location_id)).filter(Number.isFinite);
      } catch (e: any) {
        this.logger.warn(`locations load failed for travelogue ${_id}: ${e?.message ?? e}`);
        locations = [];
      }
    }

    return {
      _id,
      title: data.title ?? null,
      rssTitle: data.rssTitle ?? null,
      slug: data.slug ?? null,
      content: data.content ?? null,
      type: type ?? null,
      author: data.author ?? null,
      image: data.image ?? null,
      video: data.video ?? null,
      locationIds: Array.isArray(data.locationIds)
        ? data.locationIds.map((n: any) => Number(n)).filter(Number.isFinite)
        : [],
      featured: data.featured === true,
      disclaim: data.disclaim === true,
      publishedAt: toTimestamp(data.publishedAt),
      calculatedDate: toTimestamp(data.calculatedDate),
      previousPage: data.previousPage ?? null,
      nextPage: data.nextPage ?? null,
      firstPage: data.firstPage ?? null,
      partsCount: data.partsCount ?? null,
      episode: data.episode ?? null,
      hits: data.hits ?? 0,
      likesCount: data.likesCount ?? 0,
      commentsCount: data.commentsCount ?? 0,
      reactionsCount: data.reactionsCount ?? 0,
      averageReactionScore: data.averageReactionScore ?? 0,
      updatedAt: data.updatedAt ?? null,
      manualUpdatedAt: data.manualUpdatedAt ?? null,
      state: data.state ?? null,
      createdAt: data.createdAt ?? null,
      locations
    };
  }

  async getTravelogueById(id: number) {

    return this.travelogueRepository.findById(id);
  }
}
