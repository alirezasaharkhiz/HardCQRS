import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class HotelSqlRepository {
  private readonly logger = new Logger(HotelSqlRepository.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findHotelById(id: number): Promise<any> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM hotels WHERE id = ?', [id]);
      return rows?.[0] ?? null;
    } catch (e) {
      this.logger.error('findHotelById error', e as any);
      throw e;
    }
  }

  async findAllHotels(): Promise<any[]> {
    try {
      const rows: any[] = await this.dataSource.query('SELECT * FROM hotels');
      return rows;
    } catch (e) {
      this.logger.error('findAllHotels error', e as any);
      throw e;
    }
  }

  async findAmenitiesByHotelId(hotelId: number): Promise<any[]> {
    try {
      const rows: any[] = await this.dataSource.query(
        `
        SELECT a.*
        FROM amenities a
        INNER JOIN amenity_hotel ah ON ah.amenity_id = a.id
        WHERE ah.hotel_id = ?
        ORDER BY a.id
        `,
        [hotelId],
      );
      return rows;
    } catch (e) {
      this.logger.error('findAmenitiesByHotelId error', e as any);
      throw e;
    }
  }
}
