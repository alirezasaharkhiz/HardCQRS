import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class TravelogueSqlRepository {
  private readonly logger = new Logger(TravelogueSqlRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findById(id: number): Promise<any | null> {
    try {
      const rows: any[] = await this.dataSource.query(
        'SELECT * FROM travelogues WHERE id = ?',
        [id]
      );
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error(`findById error for travelogue ${id}`, e as any);
      throw e;
    }
  }
}
