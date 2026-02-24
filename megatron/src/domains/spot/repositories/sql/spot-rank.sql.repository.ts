import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface SpotRankRow {
  reviewRate: number | null;
  reviewRank: number | null;
  spotsCount: number | null;
}

@Injectable()
export class SpotRankSqlRepository {
  private readonly logger = new Logger(SpotRankSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) { }

  async getSpotRank(id: number, type: string): Promise<SpotRankRow | null> {
    try {
      const latest: any[] = await this.dataSource.query(
        `
        SELECT
          review_rate  AS reviewRate,
          review_rank  AS reviewRank,
          spots_count  AS spotsCount
        FROM spot_ranks
        WHERE spot_type = ?
          AND spot_id = ?
        ORDER BY id DESC
        LIMIT 1
      `,
        [type, id],
      );
      if (latest?.[0]) {
        const r = latest[0];
        return {
          reviewRate: Number(r.reviewRate ?? 0),
          reviewRank: Number(r.reviewRank ?? 0),
          spotsCount: Number(r.spotsCount ?? 0),
        };
      }

      const agg: any[] = await this.dataSource.query(
        `
        SELECT
          MAX(review_rate)  AS reviewRate,
          MAX(review_rank)  AS reviewRank,
          MAX(spots_count)  AS spotsCount
        FROM spot_ranks
        WHERE spot_type = ?
          AND spot_id = ?
      `,
        [type, id],
      );
      if (agg?.[0]) {
        const r = agg[0];
        return {
          reviewRate: Number(r.reviewRate ?? 0),
          reviewRank: Number(r.reviewRank ?? 0),
          spotsCount: Number(r.spotsCount ?? 0),
        };
      }

      return null;
    } catch (e) {
      this.logger.error(`getSpotRank(${id}, ${type}) failed`, e as any);
      throw e;
    }
  }

}
