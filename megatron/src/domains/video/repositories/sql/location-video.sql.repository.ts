import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class LocationVideoSqlRepository {
  private readonly logger = new Logger(LocationVideoSqlRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) { }

  async findLocationsByVideoId(videoId: number): Promise<any[]> {
    try {
      return await this.dataSource.query(
        'SELECT location_id FROM location_video WHERE video_id = ?',
        [videoId],
      );
    } catch (e) {
      this.logger.error(`findLocationsByVideoId error for video ${videoId}`, e as any);
      throw e;
    }
  }
}
