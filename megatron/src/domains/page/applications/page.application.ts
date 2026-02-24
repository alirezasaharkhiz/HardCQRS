import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PageApplication {
  private readonly logger = new Logger(PageApplication.name);

  async transformPageData(data: any): Promise<any | null> {
    this.logger.debug('PageApplication.transformPageData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      title: data.title ?? null,
      slug: data.slug ?? null,
      content: data.content ?? null,
      keywords: data.keywords ?? null,
      description: data.description ?? null,
    };
  }

  async transformLandingPageData(data: any): Promise<any | null> {
    this.logger.debug('PageApplication.transformLandingPageData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      data: data.data ?? null,
      metaKeywords: data.meta_keywords ?? null,
      title: data.title ?? null,
      component: data.component ?? null,
      metaDescription: data.meta_description ?? null,
    };
  }
}
