import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ParameterSqlRepository {
  private readonly logger = new Logger(ParameterSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) { }

  async findParameteryId(id: number): Promise<any> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM parameter WHERE id = ?', [id]);
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findParameterById error', e as any);
      throw e;

    }
  }
}
