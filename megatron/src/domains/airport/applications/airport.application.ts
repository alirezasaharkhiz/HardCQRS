import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AirportApplication {
    private readonly logger = new Logger(AirportApplication.name);

    async transformAirportData(row: any): Promise<any | null> {
        if (!row) return null;

        const toInt = (v: any, d = 0) => {
            const n = parseInt(String(v ?? ''), 10);
            return Number.isFinite(n) ? n : d;
        };
        const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));
        const lower = (s: any) => {
            const v = safeStr(s);
            return v == null ? null : v.toLowerCase();
        };

        const lat = row?.latitude;
        const lon = row?.longitude;
        const hasGeo =
            lat != null && lon != null && lat !== '' && lon !== '' && lat !== 'NaN' && lon !== 'NaN' &&
            !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lon));

        const _id = toInt(row.id);
        if (!_id) return null;

        return {
            _id,
            titleFa: safeStr(row.title_fa),
            titleEn: safeStr(row.title_en),
            slug: safeStr(row.slug),
            location: row.location_id != null ? toInt(row.location_id) : null,
            iataCode: lower(row.iata_code),
            icaoCode: lower(row.icao_code),
            faaCode: lower(row.faa_code),
            geoLocation: hasGeo
                ? {
                    type: 'Point',
                    coordinates: [Number(lon), Number(lat)],
                }
                : null,
        };
    }
}
