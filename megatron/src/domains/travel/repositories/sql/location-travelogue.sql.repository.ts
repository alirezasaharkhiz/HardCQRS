import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class LocationTravelogueSqlRepository {
  private readonly logger = new Logger(LocationTravelogueSqlRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findLocationsByTravelogueId(travelogueId: number): Promise<any[]> {
    try {
      return await this.dataSource.query(
        'SELECT location_id FROM location_travelogue WHERE travelogue_id = ?',
        [travelogueId],
      );
    } catch (e) {
      this.logger.error(`findLocationsByTravelogueId error for travelogue ${travelogueId}`, e as any);
      throw e;
    }
  }
}
