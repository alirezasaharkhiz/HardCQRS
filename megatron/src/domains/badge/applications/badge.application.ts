import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BadgeApplication {
  private readonly logger = new Logger(BadgeApplication.name);

  async transformBadgeData(data: any): Promise<any | null> {
    this.logger.debug('BadgeApplication.transformBadgeData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      title: data.title ?? null,
      level: Number(data.level ?? 0),
      count: Number(data.count ?? 0),
      type: Number(data.type ?? 0),
    };
  }

  async transformBadgeUserData(data: any): Promise<any | null> {
    this.logger.debug('BadgeApplication.transformBadgeUserData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    return {
      _id,
      badge: Number(data.badge_id) ?? null,
      user: Number(data.user_id) ?? null,
      type: Number(data.type) ?? null,
      createdAt: data.created_at ?? null,
    };
  }
}
