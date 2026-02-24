import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserApplication {
  private readonly logger = new Logger(UserApplication.name);

  async transformContentUserData(data: any): Promise<any | null> {
    this.logger.debug('UserApplication.transformUserData()');

    const { id } = data || {};

    const _id = Number(id);
    if (!Number.isFinite(_id)) {
      this.logger.debug('No id detected');
      return null;
    }

    return {
      _id,
      firstName: data.first_name ?? null,
      lastName: data.last_name ?? null,
      nickname: data.nick_name ?? null,
      username: data.username ?? null,
      email: data.email ?? null,
      mobile: data.mobile ?? null,
      instagram: data.instagram ?? null,
      authorDescription: data.author_description ?? null,
      avatar: data.avatar ?? null,
      role: data.role_id ?? null,
      points: Number(data.points ?? 0),
      level: Number(data.level ?? 0),
      loginableType: data.loginable_type ?? null,
      loginableId: data.loginable_id ?? null,
      profileActivatedAt: data.profile_activated_at ?? null,
      state: data.state ?? null,
    };
  }

  async transformSpotUserData(data: any): Promise<any | null> {
    this.logger.debug('UserApplication.transformSpotUserData()');

    const { id, ...rest } = data || {};
    const _id = Number(id);
    if (!Number.isFinite(_id)) return null;

    const toInt = (v: any, d: number | null = null) => {
      if (v === null || v === undefined || v === '') return d;
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };
    const safeStr = (s: any) => (s == null || String(s).trim() === '' ? null : String(s));

    return {
      _id,
      firstName: safeStr(rest.first_name),
      lastName: safeStr(rest.last_name),
      nickname: safeStr(rest.nick_name),
      username: safeStr(rest.username),
      email: safeStr(rest.email),
      mobile: safeStr(rest.mobile),
      avatar: safeStr(rest.avatar),
      role: toInt(rest.role_id, null),
      points: toInt(rest.points, null),
      level: toInt(rest.level, null),
      loginableType: safeStr(rest.loginable_type),
      loginableId: toInt(rest.loginable_id, null),
      profileActivatedAt: safeStr(rest.profile_activated_at),
      state: toInt(rest.state, null),
    };
  }
}
