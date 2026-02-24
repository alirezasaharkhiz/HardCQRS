import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AirlineSqlRepository {
  private readonly logger = new Logger(AirlineSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findAirlineById(id: number): Promise<any> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM airlines WHERE id = ?', [id]);
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findAirlineById error', e as any);
      throw e;
    }
  }

  async findAllAirlines(): Promise<any[]> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM airlines');
      return rows;
    } catch (e) {
      this.logger.error('findAllAirlines error', e as any);
      throw e;
    }
  }
}
