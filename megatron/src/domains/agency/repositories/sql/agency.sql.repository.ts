import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AgencySqlRepository {
  private readonly logger = new Logger(AgencySqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findAgencyById(id: number): Promise<any> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM agencies WHERE id = ?', [id]);
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findAgencyById error', e as any);
      throw e;
    }
  }

  async findAllAgencies(): Promise<any[]> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM agencies');
      return rows;
    } catch (e) {
      this.logger.error('findAllAgencies error', e as any);
      throw e;
    }
  }
}
