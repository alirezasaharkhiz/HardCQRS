import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CategoryApplication {
  private readonly logger = new Logger(CategoryApplication.name);

  async transformCategoryData(data: any): Promise<any | null> {
    this.logger.debug('CategoryApplication.transformCategoryData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      title: data.title ?? null,
      slug: data.slug ?? null,
      content: data.content ?? null,
      parent: data.parent_id ?? null,
      image: data.image_id ?? null,
      left: Number(data.lft ?? 0),
      right: Number(data.rgt ?? 0),
      depth: Number(data.depth ?? 0),
      ordering: Number(data.ordering ?? null)
    };
  }
}
