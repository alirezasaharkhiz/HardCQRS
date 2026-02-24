import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class CommentSqlRepository {
  private readonly logger = new Logger(CommentSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findById(id: number): Promise<any> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM comments WHERE id = ?', [id]);
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findCommentById error', e as any);
      throw e;
    }
  }

  async getCountOfActiveComments(id: number, type: string): Promise<number> {
    try {
      const rows: any[] = await this.dataSource.query(
        'SELECT COUNT(*) AS cnt FROM comments WHERE commentable_id = ? AND LOWER(commentable_type) = LOWER(?) AND state = 1 AND status = 2',
        [id, type]
      );
      return Number(rows?.[0]?.cnt ?? 0);
    } catch (e) {
      this.logger.error('getCountOfComments error', e as any);
      throw e;
    }
  }

}
