import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AmenitySqlRepository {
  private readonly logger = new Logger(AmenitySqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) { }

  async findAmenityById(id: number): Promise<any> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM amenities WHERE id = ?', [id]);
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findAmenityById error', e as any);
      throw e;
    }
  }
}
