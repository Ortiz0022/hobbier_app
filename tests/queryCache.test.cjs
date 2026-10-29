const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../src/services/queryCache.js'), 'utf8');
const cacheReady = import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
let cache;
beforeEach(async () => {
  cache = await cacheReady;
  cache.clearQueryCache();
  cache.setQueryCacheUser('alice');
});

test('shares concurrent loads and reuses recent data across screens', async () => {
  const pending = deferred();
  let calls = 0;
  const key = cache.queryKeys.activities('alice');
  const load = () => { calls++; return pending.promise; };
  const first = cache.fetchQuery(key, load);
  assert.equal(cache.fetchQuery(key, load), first);
  await Promise.resolve();
  assert.equal(calls, 1);
  pending.resolve({ activities: [], error: null });
  const data = await first;
  assert.equal(await cache.fetchQuery(key, load), data);
  assert.equal(cache.peekQuery(key), data);
  assert.equal(calls, 1);
});

test('expired data remains available while a fresh request runs', async (t) => {
  let now = 1000;
  t.mock.method(Date, 'now', () => now);
  const key = cache.queryKeys.posts('alice');
  const old = await cache.fetchQuery(key, () => ({ posts: [1] }));
  now += 30_001;
  const pending = deferred();
  const refresh = cache.fetchQuery(key, () => pending.promise);
  assert.equal(cache.peekQuery(key), old);
  pending.resolve({ posts: [2] });
  await refresh;
  assert.deepEqual(cache.peekQuery(key), { posts: [2] });
  now += 5 * 60_000 + 1;
  assert.equal(cache.peekQuery(key), undefined);
});

test('manual refresh bypasses TTL and still deduplicates simultaneous refreshes', async () => {
  const key = cache.queryKeys.friends('alice');
  await cache.fetchQuery(key, () => ({ friends: [1] }));
  const pending = deferred();
  const refresh = cache.fetchQuery(key, () => pending.promise, { force: true });
  assert.equal(cache.fetchQuery(key, () => assert.fail('duplicate'), { force: true }), refresh);
  pending.resolve({ friends: [2] });
  await refresh;
  assert.deepEqual(cache.peekQuery(key), { friends: [2] });
});

test('failed results are not cached and do not replace previously good data', async () => {
  const key = cache.queryKeys.posts('alice');
  const good = { posts: [1], error: null };
  await cache.fetchQuery(key, () => good);
  const failure = { error: new Error('offline') };
  assert.equal(await cache.fetchQuery(key, () => failure, { force: true }), failure);
  assert.equal(cache.peekQuery(key), good);
  await assert.rejects(cache.fetchQuery(key, () => { throw Error('offline'); }, { force: true }));
  assert.equal(cache.peekQuery(key), good);
  const emptyKey = cache.queryKeys.posts('bob');
  await cache.fetchQuery(emptyKey, () => failure);
  assert.equal(cache.peekQuery(emptyKey), undefined);
  assert.deepEqual(await cache.fetchQuery(emptyKey, () => ({ posts: [2] })), { posts: [2] });
});

test('mutations invalidate only related entries', async () => {
  const a = cache.queryKeys.activities('alice');
  const b = cache.queryKeys.friends('alice');
  await cache.fetchQuery(a, () => [1], { tags: ['activities'] });
  await cache.fetchQuery(b, () => [2], { tags: ['social'] });
  cache.invalidateQueries('activities');
  assert.equal(cache.peekQuery(a), undefined);
  assert.deepEqual(cache.peekQuery(b), [2]);
});

test('an invalidated in-flight read returns the newer result', async () => {
  const key = cache.queryKeys.activities('alice');
  const old = deferred();
  const first = cache.fetchQuery(key, () => old.promise, { tags: ['activities'] });
  await Promise.resolve();
  cache.invalidateQueries('activities');
  const fresh = cache.fetchQuery(key, () => [2], { tags: ['activities'] });
  await fresh;
  old.resolve([1]);
  assert.deepEqual(await first, [2]);
  assert.deepEqual(cache.peekQuery(key), [2]);
});

test('logout, account changes and late responses cannot repopulate old session data', async () => {
  const aliceKey = cache.queryKeys.friends('alice');
  const pending = deferred();
  const first = cache.fetchQuery(aliceKey, () => pending.promise);
  await Promise.resolve();
  cache.setQueryCacheUser(null);
  cache.setQueryCacheUser('bob');
  assert.notEqual(cache.queryKeys.friends('alice'), aliceKey);
  pending.resolve(['private']);
  await first;
  assert.equal(cache.peekQuery(aliceKey), undefined);
  cache.setQueryCacheUser('alice');
  assert.equal(cache.peekQuery(aliceKey), undefined);
});

test('keeping the same session preserves cache; feed pages have separate keys', async () => {
  const key = cache.queryKeys.feed('alice', 3, 0);
  await cache.fetchQuery(key, () => [1]);
  cache.setQueryCacheUser('alice');
  assert.deepEqual(cache.peekQuery(key), [1]);
  assert.notEqual(key, cache.queryKeys.feed('alice', 10, 0));
  assert.notEqual(key, cache.queryKeys.feed('alice', 3, 0, 'older'));
});

test('cache is bounded instead of retaining every visited page', async () => {
  for (let i = 0; i < 120; i++) await cache.fetchQuery(cache.queryKey('page', i), () => [i]);
  assert.equal(cache.peekQuery(cache.queryKey('page', 0)), undefined);
  assert.deepEqual(cache.peekQuery(cache.queryKey('page', 119)), [119]);
});

// Execute real service functions against a simulated request boundary.
const babel = require('@babel/core');
function services() {
  const calls = [];
  let fail = false;
  const backend = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'alice' } } } }) },
    rpc: async (name) => { calls.push(name); return { data: { success: true }, error: fail ? Error('failed') : null }; },
    from(table) {
      let operation = 'read', single = false;
      const query = new Proxy({}, { get(_, method) {
        if (method === 'then') return (resolve, reject) => {
          calls.push(table + ':' + operation);
          let data = [];
          if (table === 'posts') data = [{ id: 'p1', user_activity: { activity: { title: 'Hobby' } }, post_reactions: [] }];
          if (table === 'user_activities') data = [{ id: 'a1', status: 'PENDING', posts: [] }];
          if (single) data = operation === 'read' ? null : { id: 'new', status: 'PENDING' };
          return Promise.resolve({ data, error: fail ? Error('failed') : null }).then(resolve, reject);
        };
        return () => {
          if (['insert', 'update', 'delete'].includes(method)) operation = method;
          if (['single', 'maybeSingle'].includes(method)) single = true;
          return query;
        };
      } });
      return query;
    },
  };
  const load = (file) => {
    const out = {};
    const code = babel.transformSync(fs.readFileSync(path.join(__dirname, '../src/services/', file), 'utf8'), {
      configFile: false, babelrc: false, plugins: [require('@babel/plugin-transform-modules-commonjs')],
    }).code;
    vm.runInNewContext(code, { exports: out, console: { ...console, error() {} }, require: (name) => {
      if (name === './queryCache') return cache;
      if (name === '../config/supabase') return { supabase: backend };
      if (name === 'react-native') return { Platform: { OS: 'web' } };
      if (name === './pushService') return { avisar: () => {}, AVISO: new Proxy({}, { get: (_t, kind) => String(kind) }) };
      return {};
    } });
    return out;
  };
  return { activity: load('activityService.js'), social: load('socialService.js'), admin: load('adminService.js'), rooms: load('roomsService.js').roomsService, calls, fail: (v) => { fail = v; } };
}

test('activities and friends are shared across home, profile and missions', async () => {
  const s = services();
  await Promise.all([s.activity.getUserActivities('alice'), s.activity.getUserActivities('alice')]);
  await s.social.getFriendsFeed('alice', 3);
  await s.social.getFriendsList('alice');
  await s.social.getFriendsFeed('alice', 3);
  assert.equal(s.calls.filter((v) => v === 'user_activities:read').length, 1);
  assert.equal(s.calls.filter((v) => v === 'friendships:read').length, 1);
  assert.equal(s.calls.filter((v) => v === 'posts:read').length, 1);
  await s.social.getFriendsFeed('alice', 3, 0, { force: true });
  assert.equal(s.calls.filter((v) => v === 'friendships:read').length, 2);
  assert.equal(s.calls.filter((v) => v === 'posts:read').length, 2);
});

test('successful activity, reaction, friendship and room mutations invalidate snapshots', async () => {
  const s = services();
  await s.activity.getUserActivities('alice');
  await s.social.getUserPosts('alice');
  await s.activity.completeActivityRPC('a1', 'photo');
  assert.equal(cache.peekQuery(cache.queryKeys.activities('alice')), undefined);
  assert.equal(cache.peekQuery(cache.queryKeys.posts('alice')), undefined);
  await s.social.getUserPosts('alice');
  await s.social.togglePostReaction('p1', 'alice');
  assert.equal(cache.peekQuery(cache.queryKeys.posts('alice')), undefined);
  await s.social.getFriendsList('alice');
  await s.social.sendFriendRequest('alice', 'bob');
  assert.equal(cache.peekQuery(cache.queryKeys.friends('alice')), undefined);
  await s.rooms.getMyRooms();
  await s.rooms.getMyRooms();
  assert.equal(s.calls.filter((v) => v === 'rooms:read').length, 1);
  await s.rooms.acceptRoomInvitation('inv1');
  assert.equal(cache.peekQuery(cache.queryKeys.rooms()), undefined);
});

test('failed mutations retain valid snapshots', async () => {
  const s = services();
  const data = await s.activity.getUserActivities('alice');
  s.fail(true);
  const result = await s.social.deleteOwnPost('p1');
  assert(result.error);
  assert.equal(cache.peekQuery(cache.queryKeys.activities('alice')), data);
});

test('admin mutation errors retain their original failure path and do not clear good data', async () => {
  const s = services();
  const data = await s.activity.getUserActivities('alice');
  s.fail(true);
  const failed = await s.admin.suspendProfileAdmin('bob', 'Motivo suficientemente largo');
  assert(failed.error);
  assert.equal(failed.motivoGuardado, false);
  assert.equal(cache.peekQuery(cache.queryKeys.activities('alice')), data);
  s.fail(false);
  const success = await s.admin.suspendProfileAdmin('bob', 'Motivo suficientemente largo');
  assert.equal(success.error, null);
  assert.equal(cache.peekQuery(cache.queryKeys.activities('alice')), undefined);
});
