import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AmenityApplication {
  private readonly logger = new Logger(AmenityApplication.name);

  async transformAmenityData(data: any): Promise<any | null> {
    this.logger.debug('AmenityApplication.transformAmenityData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toNum = (v: any): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      _id,
      title: data.name ?? null,
      type: toNum(data.type),
    };
  }
}
