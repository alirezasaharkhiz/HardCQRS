import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class RestaurantRestaurantTypeSqlRepository {
    private readonly logger = new Logger(RestaurantRestaurantTypeSqlRepository.name);
    constructor(@InjectDataSource() private readonly dataSource: DataSource) { }

    async findTypesByRestaurantId(restaurantId: number): Promise<number[]> {
        try {
            const rows: Array<{ type_id: any }> = await this.dataSource.query(
                'SELECT type_id FROM restaurant_restauranttype WHERE restaurant_id = ?',
                [restaurantId],
            );
            return (rows ?? [])
                .map(r => Number(r.type_id))
                .filter(Number.isFinite);
        } catch (e) {
            this.logger.error('findTypesByRestaurantId error', e as any);
            throw e;
        }
    }
}
