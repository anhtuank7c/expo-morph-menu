/**
 * The mock Murmur backend: REST routes over the in-memory records in
 * `seed.ts`. Runs inside the app, reached through `server.fetch`.
 *
 *   GET    /me
 *   GET    /feed?tab=for_you|following&cursor=&limit=
 *   GET    /posts/:id                 GET /posts/:id/replies
 *   POST   /posts                     (Idempotency-Key)
 *   PUT    /posts/:id/like            DELETE /posts/:id/like
 *   POST   /posts/:id/votes
 *   GET    /users?q=                  GET /users/:handle      GET /users/:handle/posts
 *   PUT    /users/:handle/follow      DELETE /users/:handle/follow
 *   GET    /trends
 *   GET    /notifications             POST /notifications/read
 *   GET    /conversations             POST /conversations
 *   GET    /conversations/:id/messages
 *   POST   /conversations/:id/messages
 *   POST   /conversations/:id/read
 *   POST   /live                      GET /live/:id           DELETE /live/:id
 *
 * Plus /auth/login, /auth/refresh and /auth/logout from the generic mock server.
 */

import type { ConversationSummary, Message, Notice, Post, User } from '../core/api/dto';
import { chaosFromEnv, createMockServer, error, json, noContent, route } from './mockServer';
import {
  AUTO_REPLIES,
  CONVERSATIONS,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  FOLLOWS,
  ME_ID,
  NOTICES,
  POSTS,
  TRENDS,
  USERS,
  type ConversationRecord,
  type MessageRecord,
  type PostRecord,
  type UserRecord,
} from './seed';

export const API_BASE_URL = 'https://api.murmur.mock/v1';

/* --- records ---------------------------------------------------------------- */

const users = new Map(USERS.map((u) => [u.id, u]));
const follows = new Map(Object.entries(FOLLOWS).map(([id, list]) => [id, new Set(list)]));
const posts = [...POSTS];
const notices = [...NOTICES];
const conversations = [...CONVERSATIONS];
const lives = new Map<string, { id: string; title: string; startedAt: number; endedAt?: number }>();
let replyIndex = 0;
let seq = 1;
const nextId = (prefix: string) => `${prefix}${Date.now().toString(36)}${seq++}`;

/* --- DTOs ------------------------------------------------------------------- */

const followerCount = (id: string) =>
  users.get(id)!.followersBase + [...follows.values()].filter((set) => set.has(id)).length;

function toUser(u: UserRecord, viewer: string): User {
  return {
    id: u.id,
    name: u.name,
    handle: u.handle,
    color: u.color,
    bio: u.bio,
    followers: followerCount(u.id),
    following: follows.get(u.id)?.size ?? 0,
    isFollowed: follows.get(viewer)?.has(u.id) ?? false,
  };
}

function toPost(p: PostRecord, viewer: string): Post {
  return {
    id: p.id,
    author: toUser(users.get(p.authorId)!, viewer),
    text: p.text,
    createdAt: p.createdAt,
    media: p.media,
    poll: p.poll && {
      days: p.poll.days,
      options: p.poll.options.map((o) => ({ ...o })),
      votedOption: p.poll.voters[viewer] ?? null,
    },
    likeCount: p.likeBase + p.likedBy.size,
    liked: p.likedBy.has(viewer),
    repostCount: p.repostCount,
    replyCount: posts.filter((r) => r.replyTo === p.id).length,
    replyTo: p.replyTo,
  };
}

function toSummary(c: ConversationRecord, viewer: string): ConversationSummary {
  const last = c.messages.at(-1) ?? null;
  return {
    id: c.id,
    user: toUser(users.get(c.userId)!, viewer),
    lastMessage: last && { ...last },
    unread: c.unread,
    typing: c.typingUntil > Date.now(),
    updatedAt: last?.createdAt ?? 0,
  };
}

const findPost = (id: string) => posts.find((p) => p.id === id);
const findUser = (handle: string) => USERS.find((u) => u.handle === handle);
const findConversation = (id: string) => conversations.find((c) => c.id === id);

/* --- routes ----------------------------------------------------------------- */

const routes = [
  route('GET', '/me', ({ userId }) => json(toUser(users.get(userId)!, userId))),

  route('GET', '/feed', ({ query, userId }) => {
    const limit = Math.min(Number(query.limit) || 8, 20);
    const offset = Number(query.cursor) || 0;
    const followed = follows.get(userId) ?? new Set<string>();
    const all = posts
      .filter((p) => !p.replyTo && (query.tab !== 'following' || followed.has(p.authorId) || p.authorId === userId))
      .sort((a, b) => b.createdAt - a.createdAt);
    const items = all.slice(offset, offset + limit).map((p) => toPost(p, userId));
    return json({ items, nextCursor: offset + limit < all.length ? String(offset + limit) : null });
  }),

  route('GET', '/posts/:id', ({ params, userId }) => {
    const p = findPost(params.id);
    return p ? json(toPost(p, userId)) : error(404, 'not_found', 'Post not found');
  }),

  route('GET', '/posts/:id/replies', ({ params, userId }) =>
    json(posts.filter((p) => p.replyTo === params.id).sort((a, b) => a.createdAt - b.createdAt).map((p) => toPost(p, userId))),
  ),

  route('POST', '/posts', ({ body, userId }) => {
    const text = String(body?.text ?? '').trim();
    if (text.length > 280) return error(422, 'text_too_long', 'Posts are limited to 280 characters');
    if (!text && !body?.media) return error(422, 'empty_post', 'A post needs text or a photo');
    const options: string[] | undefined = body?.poll?.options;
    if (options && (options.length < 2 || options.length > 4)) return error(422, 'invalid_poll', 'A poll needs 2 to 4 choices');
    const record: PostRecord = {
      id: nextId('p'),
      authorId: userId,
      text,
      createdAt: Date.now(),
      media: body?.media,
      poll: options && { days: Number(body.poll.days) || 1, voters: {}, options: options.map((label) => ({ label, votes: 0 })) },
      likedBy: new Set(),
      likeBase: 0,
      repostCount: 0,
    };
    posts.unshift(record);
    return json(toPost(record, userId), 201);
  }),

  // PUT/DELETE make likes idempotent: repeating the request has no extra effect.
  route('PUT', '/posts/:id/like', ({ params, userId }) => {
    const p = findPost(params.id);
    if (!p) return error(404, 'not_found', 'Post not found');
    p.likedBy.add(userId);
    return json(toPost(p, userId));
  }),
  route('DELETE', '/posts/:id/like', ({ params, userId }) => {
    const p = findPost(params.id);
    if (!p) return error(404, 'not_found', 'Post not found');
    p.likedBy.delete(userId);
    return json(toPost(p, userId));
  }),

  route('POST', '/posts/:id/votes', ({ params, body, userId }) => {
    const p = findPost(params.id);
    if (!p?.poll) return error(404, 'not_found', 'Poll not found');
    if (p.poll.voters[userId] !== undefined) return error(409, 'already_voted', 'You already voted in this poll');
    const option = Number(body?.option);
    if (!p.poll.options[option]) return error(422, 'invalid_option', 'Unknown choice');
    p.poll.voters[userId] = option;
    p.poll.options[option].votes += 1;
    return json(toPost(p, userId));
  }),

  route('GET', '/users', ({ query, userId }) => {
    const q = (query.q ?? '').toLowerCase();
    return json(
      USERS.filter((u) => u.id !== userId && (!q || u.name.toLowerCase().includes(q) || u.handle.includes(q))).map((u) =>
        toUser(u, userId),
      ),
    );
  }),
  route('GET', '/users/:handle', ({ params, userId }) => {
    const u = findUser(params.handle);
    return u ? json(toUser(u, userId)) : error(404, 'not_found', 'User not found');
  }),
  route('GET', '/users/:handle/posts', ({ params, userId }) => {
    const u = findUser(params.handle);
    if (!u) return error(404, 'not_found', 'User not found');
    return json(posts.filter((p) => p.authorId === u.id && !p.replyTo).map((p) => toPost(p, userId)));
  }),
  route('PUT', '/users/:handle/follow', ({ params, userId }) => {
    const u = findUser(params.handle);
    if (!u) return error(404, 'not_found', 'User not found');
    if (!follows.has(userId)) follows.set(userId, new Set());
    follows.get(userId)!.add(u.id);
    return json(toUser(u, userId));
  }),
  route('DELETE', '/users/:handle/follow', ({ params, userId }) => {
    const u = findUser(params.handle);
    if (!u) return error(404, 'not_found', 'User not found');
    follows.get(userId)?.delete(u.id);
    return json(toUser(u, userId));
  }),

  route('GET', '/trends', () => json(TRENDS)),

  route('GET', '/notifications', ({ userId }) =>
    json(
      notices
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((n): Notice => {
          const p = n.postId ? findPost(n.postId) : undefined;
          return {
            id: n.id,
            kind: n.kind,
            user: toUser(users.get(n.userId)!, userId),
            postId: n.postId,
            postText: p?.text,
            createdAt: n.createdAt,
            read: n.read,
          };
        }),
    ),
  ),
  route('POST', '/notifications/read', () => {
    notices.forEach((n) => (n.read = true));
    return noContent();
  }),

  route('GET', '/conversations', ({ userId }) =>
    json(
      conversations
        .filter((c) => c.messages.length > 0)
        .map((c) => toSummary(c, userId))
        .sort((a, b) => b.updatedAt - a.updatedAt),
    ),
  ),
  route('POST', '/conversations', ({ body, userId }) => {
    const other = users.get(String(body?.userId));
    if (!other || other.id === userId) return error(422, 'invalid_user', 'Unknown user');
    let c = conversations.find((x) => x.userId === other.id);
    const created = !c;
    if (!c) {
      c = { id: nextId('c'), userId: other.id, messages: [], unread: 0, typingUntil: 0 };
      conversations.unshift(c);
    }
    return json(toSummary(c, userId), created ? 201 : 200);
  }),
  route('GET', '/conversations/:id/messages', ({ params, userId }) => {
    const c = findConversation(params.id);
    if (!c) return error(404, 'not_found', 'Conversation not found');
    return json({ conversation: toSummary(c, userId), messages: c.messages.map((m) => ({ ...m })) });
  }),
  route('POST', '/conversations/:id/messages', ({ params, body, userId }) => {
    const c = findConversation(params.id);
    if (!c) return error(404, 'not_found', 'Conversation not found');
    const text = String(body?.text ?? '').trim();
    if (!text) return error(422, 'empty_message', 'Message is empty');
    // The client id also deduplicates sends that the client retried by hand.
    const existing = body?.clientId && c.messages.find((m) => m.clientId === body.clientId);
    if (existing) return json({ ...existing });
    const message: MessageRecord = { id: nextId('m'), clientId: body?.clientId, from: userId, text, createdAt: Date.now() };
    c.messages.push(message);
    // The other person starts typing, then replies.
    setTimeout(() => (c.typingUntil = Date.now() + 1800), 500);
    setTimeout(() => {
      c.messages.push({ id: nextId('m'), from: c.userId, text: AUTO_REPLIES[replyIndex++ % AUTO_REPLIES.length], createdAt: Date.now() });
      c.typingUntil = 0;
      c.unread += 1;
    }, 2300);
    return json({ ...message } satisfies Message, 201);
  }),
  route('POST', '/conversations/:id/read', ({ params }) => {
    const c = findConversation(params.id);
    if (!c) return error(404, 'not_found', 'Conversation not found');
    c.unread = 0;
    return noContent();
  }),

  route('POST', '/live', ({ body }) => {
    const live = { id: nextId('live'), title: String(body?.title ?? '').trim() || 'Untitled broadcast', startedAt: Date.now() };
    lives.set(live.id, live);
    return json({ ...live, viewers: 0 }, 201);
  }),
  route('GET', '/live/:id', ({ params }) => {
    const live = lives.get(params.id);
    if (!live) return error(404, 'not_found', 'Broadcast not found');
    const seconds = ((live.endedAt ?? Date.now()) - live.startedAt) / 1000;
    return json({ ...live, viewers: Math.floor(seconds * 1.7 + Math.sqrt(seconds) * 3) });
  }),
  route('DELETE', '/live/:id', ({ params }) => {
    const live = lives.get(params.id);
    if (live && !live.endedAt) live.endedAt = Date.now();
    return noContent();
  }),
];

export const DEMO_ACCOUNT = { email: DEMO_EMAIL, password: DEMO_PASSWORD };

export const server = createMockServer({
  baseUrl: API_BASE_URL,
  secret: 'murmur-mock-secret',
  routes,
  authenticate: (body) =>
    String(body?.email).trim().toLowerCase() === DEMO_EMAIL && body?.password === DEMO_PASSWORD ? ME_ID : null,
  accessTtlSec: 60,
  latencyMs: [180, 520],
  chaos: chaosFromEnv('low'),
});
