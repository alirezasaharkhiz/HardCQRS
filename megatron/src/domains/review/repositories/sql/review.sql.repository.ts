import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ReviewSqlRepository {
    private readonly logger = new Logger(ReviewSqlRepository.name);

    constructor(@InjectDataSource() private dataSource: DataSource) { }

    async findReviewyId(id: number): Promise<any> {
        try {
            const rows: any[] = await this.dataSource.query('SELECT * FROM reviews WHERE id = ?', [id]);
            return rows?.[0] ?? null;
        } catch (e) {
            this.logger.error('findReviewById error', e as any);
            throw e;

        }
    }
}
