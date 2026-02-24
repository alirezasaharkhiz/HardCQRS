import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AttractionSqlRepository {
  private readonly logger = new Logger(AttractionSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findAttractionById(id: number): Promise<any | null> {
    try {
      const rows: any[] = await this.dataSource.query(
        'SELECT * FROM attractions WHERE id = ?',
        [id],
      );
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findAttractionById error', e as any);
      throw e;
    }
  }
}
