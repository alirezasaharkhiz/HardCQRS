import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LabelApplication {
  private readonly logger = new Logger(LabelApplication.name);

  async transformLabelData(data: any): Promise<any | null> {
    this.logger.debug('LabelApplication.transformLabelData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      title: data.title ?? null,
      slug: data.slug ?? null,
      image: data.image ?? null,
      hits: Number(data.hits ?? 0),
    };
  }
}
