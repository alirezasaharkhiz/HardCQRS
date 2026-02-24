import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class LocationSqlRepository {
  private readonly logger = new Logger(LocationSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) { }

  async findLocationById(id: number): Promise<any> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM locations WHERE id = ?', [id]);
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findAgencyById error', e as any);
      throw e;
    }
  }
}
