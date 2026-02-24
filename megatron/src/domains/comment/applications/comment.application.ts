import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CommentApplication {
  private readonly logger = new Logger(CommentApplication.name);

  async transformCommentData(data: any): Promise<any | null> {
    this.logger.debug('CommentApplication.transformCommentData()');

    const { id } = data || {};
    if (!data) return null;

    const toNum = (v: any, d = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : d;
    };

    const toNumOrNull = (v: any) => {
      if (v === null || v === undefined || v === '') return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const parseTimestamp = (val?: any): number | null => {
      if (val === null || val === undefined || val === '') return null;
      const n = Number(val);
      if (Number.isFinite(n)) return n < 1e12 ? n * 1000 : n;
      const d = new Date(val);
      const t = d.getTime();
      return Number.isNaN(t) ? null : t;
    };

    const _id = Number(id)
    if (_id == null) return null;

    const rawType: string = String(data.commentable_type ?? '');
    const baseType = rawType.replace(/Kaban\\Models\\/g, '');
    const lcType = baseType ? baseType.toLowerCase() : '';
    const commentableType =
      baseType === 'Travelmemory' ? 'travelMemory' : (lcType || null);

    const cid = toNumOrNull(data.commentable_id);
    const is = (t: string) => baseType === t;

    const dailytrip = is('Dailytrip') ? cid : null;
    const moment = is('Moment') ? cid : null;
    const post = is('Post') ? cid : null;
    const review = is('Review') ? cid : null;
    const tour = is('Tour') ? cid : null;
    const travelMemory = is('Travelmemory') ? cid : null;
    const travelogue = is('Travelogue') ? cid : null;
    const video = is('Video') ? cid : null;

    return {
      _id,

      content: data.content ?? null,

      user: toNumOrNull(data.user_id),
      userName: data.user_name ?? null,
      userEmail: data.user_email ?? null,
      userIp: data.user_ip ?? null,

      parent: toNumOrNull(data.parent_id),
      immediateParent: toNumOrNull(data.immediate_parent_id),

      repliesCount: toNum(data.replies_count, 0),
      likesCount: toNum(data.likes_count, 0),

      commentableId: cid,
      commentableType,

      dailytrip,
      moment,
      post,
      review,
      tour,
      travelMemory,
      travelogue,
      video,

      createdAt: parseTimestamp(data.created_at),
    };
  }

}
