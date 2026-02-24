import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FaqApplication {
  private readonly logger = new Logger(FaqApplication.name);

  async transformContentFaqData(data: any): Promise<any | null> {
    this.logger.debug('FaqApplication.transformContentFaqData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      order: Number(data.order ?? 0),
      bulletin: data.bulletin_id ?? null,
      question: data.question ?? null,
      answer: data.answer ?? null,
    };
  }

  async transformSpotFaqData(data: any): Promise<any | null> {
    this.logger.debug('FaqApplication.transformSpotFaqData()');

    const { id, ...rest } = data || {};
    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toInt = (v: any, d = null as any) => {
      if (v === null || v === undefined || v === '') return d;
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));


    return {
      _id,
      order: toInt(rest.order, null),
      bulletin: toInt(rest.bulletin_id, null),
      question: safeStr(rest.question),
      answer: safeStr(rest.answer),
      output: toInt(rest.output, null),
    };
  }
}
