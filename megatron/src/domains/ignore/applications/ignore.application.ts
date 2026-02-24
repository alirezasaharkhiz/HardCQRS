import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IgnoreApplication {
  private readonly logger = new Logger(IgnoreApplication.name);

  async transformIgnoreData(data: any): Promise<any | null> {
    this.logger.debug('IgnoreApplication.transformIgnoreData()');

    const { id, ...rest } = data || {};

    const numeric = typeof id === 'string' ? Number(id) : id;
    const _id = typeof numeric === 'number' && !Number.isNaN(numeric) ? numeric : id;

    const rawType: string = String(rest.ignorable_type ?? '');
    const baseType = rawType.replace(/Kaban\\Models\\/g, '');
    const lcType = baseType ? baseType.toLowerCase() : '';

    return {
      _id,
      ignorableId: rest.ignorable_id,
      ignorableType: lcType,
      state: rest.state,
      createdBy: rest.created_by,
      updatedBy: rest.updated_by,
      createdAt: rest.created_at,
      updatedAt: rest.updated_at,
    };
  }
}
