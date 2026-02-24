import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class LocationParameterSqlRepository {
    private readonly logger = new Logger(LocationParameterSqlRepository.name);
    constructor(@InjectDataSource() private readonly dataSource: DataSource) { }

    async findLocationIdsByParameterId(parameterId: number): Promise<number[]> {
        try {
            const rows: Array<{ id: number }> = await this.dataSource.query(
                'SELECT location_id AS id FROM location_parameter WHERE parameter_id = ?',
                [parameterId],
            );
            return (rows ?? []).map(r => Number(r.id)).filter(Number.isFinite);
        } catch (e) {
            this.logger.error('findLocationIdsByParameterId error', e as any);
            throw e;
        }
    }
}
