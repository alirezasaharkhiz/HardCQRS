import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class FacilityRestaurantSqlRepository {
  private readonly logger = new Logger(FacilityRestaurantSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  /**
   * Returns facility ids linked to a restaurant (pivot: facility_restaurant).
   */
  async findFacilityIdsByRestaurantId(restaurantId: number): Promise<number[]> {
    try {
      const rows: Array<{ id: number }> = await this.dataSource.query(
        'SELECT facility_id AS id FROM facility_restaurant WHERE restaurant_id = ?',
        [restaurantId],
      );
      return (rows ?? []).map(r => Number(r.id)).filter(Number.isFinite);
    } catch (e) {
      this.logger.error('findFacilityIdsByRestaurantId error', e as any);
      throw e;
    }
  }
}
