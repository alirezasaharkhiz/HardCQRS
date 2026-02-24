import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class AmenityHotelSqlRepository {
  private readonly logger = new Logger(AmenityHotelSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findAmenityHotelByHotelId(hotelId: number): Promise<any[]> {
    try {
      const rows: any[] = await this.dataSource.query(
        'SELECT * FROM amenity_hotel WHERE hotel_id = ?',
        [hotelId],
      );
      return rows;
    } catch (e) {
      this.logger.error('findAmenityHotelByHotelId error', e as any);
      throw e;
    }
  }
}
