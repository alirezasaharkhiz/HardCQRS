import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TourApplication {
  private readonly logger = new Logger(TourApplication.name);

  async transformTourRequestOnlineTermsData(data: any): Promise<any | null> {
    this.logger.debug('TourApplication.transformTourRequestOnlineTermsData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      title: data.title ?? null,
      content: data.content ?? null,
    };
  }
}