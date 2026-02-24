import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AttractionAttractionTypeSqlRepository {
  private readonly logger = new Logger(AttractionAttractionTypeSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /**
   * Returns type ids linked to an attraction via pivot table attraction_attraction_type.
   */
  async findTypesByAttractionId(attractionId: number): Promise<{ id: number }[]> {
    try {
      const rows = await this.dataSource.query(
        'SELECT type_id AS id FROM attraction_attractiontype WHERE attraction_id = ?',
        [attractionId],
      );
      return rows ?? [];
    } catch (e) {
      this.logger.error('findTypesByAttractionId error', e as any);
      throw e;
    }
  }
}
