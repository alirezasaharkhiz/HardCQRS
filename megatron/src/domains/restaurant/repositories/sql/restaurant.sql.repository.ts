import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class RestaurantSqlRepository {
  private readonly logger = new Logger(RestaurantSqlRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findRestaurantById(id: number): Promise<any> {
      try {
          const rows: any[] = await this.dataSource.query(
              'SELECT * FROM restaurants WHERE id = ?',
              [id],
          );
          return rows?.[0] ?? null;
      } catch (e) {
          this.logger.error('findRestaurantById error', e as any);
          throw e;
      }
  }
}
