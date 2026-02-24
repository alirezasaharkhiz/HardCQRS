import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FacilityApplication {
  private readonly logger = new Logger(FacilityApplication.name);

  async transformFacilityData(data: any): Promise<any | null> {
    this.logger.debug('FacilityApplication.transformFacilityData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toNum = (v: any): number | null => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    return {
      _id,
      titleFa: data.title_fa ?? null,
      titleEn: data.title_en ?? null,
      type: toNum(data.type)
    };
  }
}
