// src/repositories/sql/location-post.sql.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class LocationPostSqlRepository {
  private readonly logger = new Logger(LocationPostSqlRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findByPostId(postId: number): Promise<
    Array<{ id: number; titleFa: string | null; titleEn: string | null; slug: string | null }>
  > {
    try {
      const rows: any[] = await this.dataSource.query(
        `
        SELECT
          l.id,
          l.title_fa AS titleFa,
          l.title_en AS titleEn,
          l.slug
        FROM location_post lp
        JOIN locations l ON l.id = lp.location_id
        WHERE lp.post_id = ?
          AND l.state = 1
          AND l.deleted_at IS NULL
        ORDER BY lp.id
        `,
        [postId],
      );
      return rows ?? [];
    } catch (e) {
      this.logger.error('findByPostId error', e as any);
      throw e;
    }
  }
}
