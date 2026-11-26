/**
 * Initial records of the mock Murmur backend. These are server-side shapes:
 * likes are sets of user ids, follows are a graph, and the client never sees
 * them directly (it receives the DTOs in `types.ts`).
 */

import type { IconName, Media } from './types';

export const ME_ID = 'me';

/** Demo credentials accepted by POST /auth/login. */
export const DEMO_EMAIL = 'demo@murmur.app';
export const DEMO_PASSWORD = 'murmur123';

export type UserRecord = { id: string; name: string; handle: string; color: string; bio: string; followersBase: number };

export type PostRecord = {
  id: string;
  authorId: string;
  text: string;
  createdAt: number;
  media?: Media;
  poll?: { options: { label: string; votes: number }[]; days: number; voters: Record<string, number> };
  likedBy: Set<string>;
  likeBase: number;
  repostCount: number;
  replyTo?: string;
};

export type NoticeRecord = {
  id: string;
  kind: 'like' | 'follow' | 'reply' | 'repost' | 'mention';
  userId: string;
  postId?: string;
  createdAt: number;
  read: boolean;
};

export type MessageRecord = { id: string; clientId?: string; from: string; text: string; createdAt: number };

export type ConversationRecord = {
  id: string;
  userId: string;
  messages: MessageRecord[];
  unread: number;
  /** The other side is "typing" until this time. */
  typingUntil: number;
};

export const USERS: UserRecord[] = [
  { id: ME_ID, name: 'You', handle: 'you', color: '#6d28d9', bio: 'Trying out expo-morph-menu.', followersBase: 128 },
  { id: 'u1', name: 'Linh Tran', handle: 'linhcodes', color: '#0ea5e9', bio: 'Mobile dev. Animations, gestures and too much coffee.', followersBase: 4210 },
  { id: 'u2', name: 'Marco Bellini', handle: 'marcob', color: '#f97316', bio: 'Design systems at a small studio in Turin.', followersBase: 1893 },
  { id: 'u3', name: 'Aisha Rahman', handle: 'aisha.r', color: '#10b981', bio: 'Product engineer. Runner. Reads RFCs for fun.', followersBase: 9120 },
  { id: 'u4', name: 'Kenji Mori', handle: 'kenjimori', color: '#e11d48', bio: 'Photographer. Mostly streets and trains.', followersBase: 15300 },
  { id: 'u5', name: 'Sofia Lind', handle: 'sofialind', color: '#8b5cf6', bio: 'Frontend lead. Accessibility first.', followersBase: 2702 },
  { id: 'u6', name: 'Duc Pham', handle: 'ducpham', color: '#eab308', bio: 'Backend, infra, and the occasional React Native bug report.', followersBase: 960 },
];

/** follower id → followed ids */
export const FOLLOWS: Record<string, string[]> = {
  [ME_ID]: ['u1', 'u3', 'u5', 'u6'],
  u1: ['u3', 'u4', ME_ID],
  u2: ['u1'],
  u3: ['u1', 'u5'],
  u4: [],
  u5: ['u1', 'u3', ME_ID],
  u6: ['u1', 'u2'],
};

const now = Date.now();
const min = 60_000;
const hour = 60 * min;

const post = (p: Omit<PostRecord, 'likedBy'> & { likedByMe?: boolean }): PostRecord => {
  const { likedByMe, ...rest } = p;
  return { ...rest, likedBy: new Set(likedByMe ? [ME_ID] : []) };
};

export const POSTS: PostRecord[] = [
  post({ id: 'p1', authorId: 'u1', text: 'Shipped a floating menu where each row opens a real route. Deep links and Android back just use the navigation stack.', createdAt: now - 12 * min, likeBase: 182, repostCount: 24 }),
  post({ id: 'p2', authorId: 'u4', text: 'Last train of the night.', createdAt: now - 48 * min, media: { color: '#1e3a8a', icon: 'train', aspect: 4 / 3 }, likeBase: 1203, likedByMe: true, repostCount: 96 }),
  post({
    id: 'p3',
    authorId: 'u3',
    text: 'Which do you reach for first when a screen feels slow?',
    createdAt: now - 2 * hour,
    poll: {
      days: 1,
      voters: {},
      options: [
        { label: 'Profiler', votes: 312 },
        { label: 'Prefetch data', votes: 451 },
        { label: 'Defer rendering', votes: 207 },
        { label: 'Guess', votes: 98 },
      ],
    },
    likeBase: 77,
    repostCount: 12,
  }),
  post({ id: 'p4', authorId: 'u2', text: 'Rule of thumb for design tokens: if two components share a value by accident, they should not share the token.', createdAt: now - 3 * hour, likeBase: 403, repostCount: 58 }),
  post({ id: 'p5', authorId: 'u5', text: 'Reminder: every drag gesture in your app needs a tap alternative.', createdAt: now - 5 * hour, likeBase: 951, repostCount: 230 }),
  post({ id: 'p6', authorId: 'u4', text: 'Morning market.', createdAt: now - 7 * hour, media: { color: '#b45309', icon: 'basket', aspect: 1 }, likeBase: 688, repostCount: 31 }),
  post({ id: 'p7', authorId: 'u6', text: 'Moved our staging builds to a nightly schedule. CI time dropped by a third.', createdAt: now - 9 * hour, likeBase: 64, repostCount: 4 }),
  post({ id: 'r1', authorId: 'u3', replyTo: 'p1', text: 'Does it handle the browser back button on web?', createdAt: now - 10 * min, likeBase: 12, repostCount: 0 }),
  post({ id: 'r2', authorId: 'u1', replyTo: 'p1', text: 'Yes, every dismiss path goes through the same code.', createdAt: now - 8 * min, likeBase: 20, repostCount: 1 }),
  post({ id: 'r3', authorId: 'u5', replyTo: 'p1', text: 'Nice. Are the rows reachable with a screen reader?', createdAt: now - 6 * min, likeBase: 7, repostCount: 0 }),
  ...olderPosts(),
];

/** Older posts so the feed has more than one page. */
function olderPosts(): PostRecord[] {
  const lines = [
    'Wrote down our release checklist. It is longer than I expected.',
    'Tip: name your feature flags after the behavior, not the ticket.',
    'Pair programming on a gesture bug. Two people, one emulator, zero progress, then suddenly fixed.',
    'The best performance fix this week was deleting a component.',
    'Reading about idempotency keys. Every POST endpoint should accept one.',
    'Rainy day in the city.',
    'Accessibility audit done. 14 issues, 11 fixed today.',
    'If your retry loop has no jitter, all your clients retry at the same second.',
    'New keyboard, same typos.',
    'Short access tokens, rotating refresh tokens. Boring and correct.',
    'Sunset from the office.',
    'Our design review now starts with the empty states.',
  ];
  const icons: IconName[] = ['umbrella', 'sunny', 'leaf', 'bicycle'];
  const colors = ['#334155', '#c2410c', '#15803d', '#0369a1'];
  return Array.from({ length: 24 }, (_, i) => {
    const author = USERS[1 + (i % (USERS.length - 1))];
    const text = lines[i % lines.length];
    const withMedia = i % 6 === 5;
    return post({
      id: `old${i + 1}`,
      authorId: author.id,
      text,
      createdAt: now - (11 + i * 2) * hour,
      media: withMedia ? { color: colors[i % colors.length], icon: icons[i % icons.length], aspect: 16 / 9 } : undefined,
      likeBase: 20 + ((i * 37) % 400),
      repostCount: (i * 7) % 40,
    });
  });
}

export const NOTICES: NoticeRecord[] = [
  { id: 'n1', kind: 'like', userId: 'u3', postId: 'p1', createdAt: now - 4 * min, read: false },
  { id: 'n2', kind: 'follow', userId: 'u4', createdAt: now - 20 * min, read: false },
  { id: 'n3', kind: 'reply', userId: 'u5', postId: 'p1', createdAt: now - 6 * min, read: false },
  { id: 'n4', kind: 'repost', userId: 'u2', postId: 'p5', createdAt: now - 2 * hour, read: true },
  { id: 'n5', kind: 'mention', userId: 'u6', postId: 'p7', createdAt: now - 9 * hour, read: true },
];

export const CONVERSATIONS: ConversationRecord[] = [
  {
    id: 'c1',
    userId: 'u1',
    unread: 2,
    typingUntil: 0,
    messages: [
      { id: 'm1', from: 'u1', text: 'Hey, did you try the new menu build?', createdAt: now - 30 * min },
      { id: 'm2', from: ME_ID, text: 'Yes, opening a chat from the menu works well.', createdAt: now - 28 * min },
      { id: 'm3', from: 'u1', text: 'Great. Can you check it on a small Android phone?', createdAt: now - 5 * min },
      { id: 'm4', from: 'u1', text: 'The emulator is fine, I mean a real device.', createdAt: now - 4 * min },
    ],
  },
  {
    id: 'c2',
    userId: 'u4',
    unread: 0,
    typingUntil: 0,
    messages: [
      { id: 'm5', from: ME_ID, text: 'That train photo is great.', createdAt: now - 3 * hour },
      { id: 'm6', from: 'u4', text: 'Thanks. Shot it on the last line home.', createdAt: now - 2 * hour },
    ],
  },
  {
    id: 'c3',
    userId: 'u2',
    unread: 1,
    typingUntil: 0,
    messages: [{ id: 'm7', from: 'u2', text: 'Sending you the token spreadsheet tomorrow.', createdAt: now - 6 * hour }],
  },
];

/** Replies the other side sends back in a chat, in order. */
export const AUTO_REPLIES = [
  'Sounds good.',
  'Let me check and get back to you.',
  'Ha, true.',
  'Can you send a screenshot?',
  'Sure, tomorrow works.',
  'Nice!',
];

/** Photos offered by the photo picker (client side). */
export const PHOTOS: Media[] = [
  { color: '#0f766e', icon: 'leaf', aspect: 1 },
  { color: '#c2410c', icon: 'sunny', aspect: 1 },
  { color: '#1d4ed8', icon: 'water', aspect: 1 },
  { color: '#7c2d12', icon: 'cafe', aspect: 1 },
  { color: '#4338ca', icon: 'moon', aspect: 1 },
  { color: '#15803d', icon: 'bicycle', aspect: 1 },
  { color: '#9d174d', icon: 'musical-notes', aspect: 1 },
  { color: '#334155', icon: 'airplane', aspect: 1 },
  { color: '#a16207', icon: 'pizza', aspect: 1 },
  { color: '#0369a1', icon: 'boat', aspect: 1 },
  { color: '#6d28d9', icon: 'planet', aspect: 1 },
  { color: '#be123c', icon: 'flower', aspect: 1 },
];

export const TRENDS = [
  { tag: '#ReactNative', posts: '12.4K posts' },
  { tag: '#ExpoRouter', posts: '3,210 posts' },
  { tag: 'Reanimated 4', posts: '1,872 posts' },
  { tag: '#a11y', posts: '8,045 posts' },
  { tag: 'Liquid Glass', posts: '20.1K posts' },
];
