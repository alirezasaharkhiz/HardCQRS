import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class VideoSqlRepository {
  private readonly logger = new Logger(VideoSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findById(id: number): Promise<any | null> {
    try {
      const rows: any[] = await this.dataSource.query(
        'SELECT * FROM videos WHERE id = ?',
        [id],
      );
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error(`findById error for video ${id}`, e as any);
      throw e;
    }
  }
}
