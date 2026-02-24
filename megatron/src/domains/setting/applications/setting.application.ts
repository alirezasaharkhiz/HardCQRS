import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SettingApplication {
  private readonly logger = new Logger(SettingApplication.name);

  async transformSettingData(data: any): Promise<any | null> {
    this.logger.debug('SettingApplication.transformSettingData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const parsJsonString = (val: any) => {
      if (val == null) return null;

      if (typeof val !== 'string') return val;

      const s = val.trim();
      if (!s) return '';

      if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
        try {
          return JSON.parse(s);
        } catch {
          return val;
        }
      }
      return val;
    };

    return {
      _id,
      key: data.key ?? data.name ?? null,
      value: parsJsonString(data.value ?? null),
    };
  }
}
