import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class PostSqlRepository {
  private readonly logger = new Logger(PostSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findPostyId(id: number): Promise<any> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM posts WHERE id = ?', [id]);
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findPostById error', e as any);
      throw e;
      
    }
  }
}
