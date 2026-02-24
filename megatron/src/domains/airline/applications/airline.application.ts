import { Injectable, Logger } from '@nestjs/common';
import { AirlineSqlRepository } from '../repositories/sql/airline.sql.repository';

@Injectable()
export class AirlineApplication {
  private readonly logger = new Logger(AirlineApplication.name);

  constructor(private airlineRepository: AirlineSqlRepository) { }

  async transformAirlineData(data: any): Promise<any | null> {
    this.logger.debug('AirlineApplication.transformAirlineData()');

    if (data?.state !== 1 || data?.deleted_at != null) {
      this.logger.debug('Airline is not published (state!=1 or deleted_at!=NULL)');
      return null;
    }

    const _id = Number(data.id);
    if (!Number.isFinite(_id)) return null;

    const lowerOrNull = (v: any): string | null => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      if (!s || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return null;
      return s.toLowerCase();
    };

    return {
      _id,
      titleFa: data.title_fa ?? null,
      titleEn: data.title_en ?? null,
      logo: data.logo ?? null,
      smallLogo: data.small_logo ?? null,
      logoId: data.logo_id ?? null,
      smallLogoId: data.small_logo_id ?? null,
      location: data.location_id ?? null,
      iataCode: lowerOrNull(data.iata_code),
      icaoCode: lowerOrNull(data.icao_code),
    };
  }
}
