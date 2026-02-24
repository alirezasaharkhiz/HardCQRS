import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class UtilityAttractionSqlRepository {
    private readonly logger = new Logger(UtilityAttractionSqlRepository.name);
    constructor(@InjectDataSource() private readonly dataSource: DataSource) { }

    async findUtilityIdsByAttractionId(attractionId: number): Promise<number[]> {
        try {
            const rows: Array<{ id: number }> = await this.dataSource.query(
                'SELECT utility_id AS id FROM attraction_utility WHERE attraction_id = ?',
                [attractionId],
            );
            return (rows ?? []).map(r => Number(r.id)).filter(Number.isFinite);
        } catch (e) {
            this.logger.error('findUtilityIdsByAttractionId error', e as any);
            throw e;
        }
    }
}
