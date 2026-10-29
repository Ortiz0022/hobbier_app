const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const file = {
  profile: 'profile/ProfileScreen.js', home: 'recommendations/RecommendationScreen.js',
  feed: 'feed/FeedScreen.js', friends: 'friends/FriendsScreen.js',
};
// Exercise the actual loaders without mounting native views or contacting a backend.
function loader(screen, name, bindings, effect = false) {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/', file[screen]), 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let fn;
  traverse(ast, {
    VariableDeclarator(p) {
      if (p.node.id.name !== name) return;
      fn = p.node.init.type === 'CallExpression' ? p.node.init.arguments[0] : p.node.init;
    },
    CallExpression(p) {
      if (effect && p.node.callee.name === 'useEffect' && source.slice(p.node.start, p.node.end).includes('firstVisit')) {
        fn = p.node.arguments[0];
      }
    },
  });
  assert(fn, `${screen}: ${name} exists`);
  return vm.runInNewContext('(' + source.slice(fn.start, fn.end) + ')', { console, ...bindings });
}

test('profile starts all three requests together and displays photos before slow activities', async () => {
  const activities = deferred(), posts = deferred(), friends = deferred();
  const started = [], shown = [];
  const load = loader('profile', 'loadExtras', {
    profile: { id: 'alice' }, extrasRequest: { current: 0 },
    getUserActivities: (_, options) => { started.push(['activities', options.force]); return activities.promise; },
    getUserPosts: (_, options) => { started.push(['posts', options.force]); return posts.promise; },
    getFriendsList: (_, options) => { started.push(['friends', options.force]); return friends.promise; },
    setCompletedActivities: () => shown.push('activities'), setPosts: () => shown.push('posts'),
    setFriendsCount: () => shown.push('friends'), setLoadingStats() {}, setLoadingPosts() {},
  });
  const done = load(true);
  assert.equal(started.length, 3);
  assert(started.every(([, force]) => force === true));
  posts.resolve({ posts: [1] });
  await Promise.resolve();
  assert.deepEqual(shown, ['posts']);
  activities.resolve({ activities: [] }); friends.resolve({ friends: [] });
  await done;
  assert.equal(shown.length, 3);
});

test('home loads mission and community together without waiting for either section', async () => {
  const activities = deferred(), posts = deferred();
  let started = 0, postsShown = false, missionShown = false;
  const load = loader('home', 'loadHomeData', {
    user: { id: 'alice' }, homeRequest: { current: 0 },
    getUserActivities: () => { started++; return activities.promise; },
    getFriendsFeed: () => { started++; return posts.promise; },
    setPendingActivity: () => { missionShown = true; }, setRecentFriendPosts: () => { postsShown = true; },
  });
  const done = load();
  assert.equal(started, 2);
  posts.resolve({ posts: [] });
  await Promise.resolve();
  assert(postsShown); assert(!missionShown);
  activities.resolve({ activities: [] });
  await done;
  assert(missionShown);
});

test('older profile responses cannot overwrite a newer load', async () => {
  const pending = deferred();
  const sequence = { current: 0 };
  let writes = 0;
  const load = loader('profile', 'loadExtras', {
    profile: { id: 'alice' }, extrasRequest: sequence,
    getUserActivities: () => pending.promise, getUserPosts: () => pending.promise,
    getFriendsList: () => pending.promise,
    setCompletedActivities: () => writes++, setPosts: () => writes++, setFriendsCount: () => writes++,
    setLoadingStats: () => writes++, setLoadingPosts: () => writes++,
  });
  const done = load();
  sequence.current++;
  pending.resolve({ activities: [], posts: [], friends: [] });
  await done;
  assert.equal(writes, 0);
});

test('feed displays publications even when advertisements have not finished', async () => {
  let adsStarted = false, postsShown = false;
  const load = loader('feed', 'fetchFirstPage', {
    user: { id: 'alice' }, FEED_PAGE_SIZE: 10, feedRequest: { current: 0 },
    adsVistosRef: { current: new Set() }, friendIdsRef: { current: null },
    loadAds: () => { adsStarted = true; return new Promise(() => {}); },
    getFriendsFeed: async (_, limit, page, { force }) => {
      assert.equal(limit, 10); assert.equal(page, 0); assert.equal(force, true);
      return { posts: [1], hasMore: true, friendIds: ['bob'], error: null };
    },
    setPosts: () => { postsShown = true; }, setHasMore() {}, setLoadMoreError() {},
  });
  assert.equal(await load(true), true);
  assert(adsStarted); assert(postsShown);
});

test('late advertisement results do not replace a newer city-specific response', async () => {
  const first = deferred(), second = deferred();
  let count = 0, shown;
  const load = loader('feed', 'loadAds', {
    adsRequest: { current: 0 },
    getMyAds: () => (++count === 1 ? first.promise : second.promise),
    setAds: (value) => { shown = value; },
  });
  const old = load(), current = load();
  second.resolve({ ads: ['new-city'] }); await current;
  first.resolve({ ads: ['old-city'] }); await old;
  assert.deepEqual(shown, ['new-city']);
});

test('community starts each initial request once instead of duplicating suggestions and sent requests', () => {
  const calls = {};
  const bind = (key) => () => { calls[key] = (calls[key] || 0) + 1; };
  const effect = loader('friends', 'initialEffect', {
    user: { id: 'alice' }, activeTab: 'search', initializedUser: { current: null },
    loadFriends: bind('friends'), loadRequests: bind('requests'), loadRoomInvitations: bind('invitations'),
    loadSuggestions: bind('suggestions'), loadSentRequests: bind('sent'),
  }, true);
  effect();
  assert.deepEqual(calls, { friends: 1, requests: 1, invitations: 1, suggestions: 1, sent: 1 });
});

test('community manual refresh forces requests and starts suggestions, sent requests and invitations together', async () => {
  const pending = deferred();
  const calls = [];
  const load = (name) => (force) => { calls.push([name, force]); return pending.promise; };
  const refresh = loader('friends', 'onRefresh', {
    activeTab: 'search', setRefreshing() {}, loadRoomInvitations: load('invitations'),
    loadFriends: load('friends'), loadRequests: load('requests'),
    loadSuggestions: load('suggestions'), loadSentRequests: load('sent'),
  });
  const done = refresh();
  assert.equal(calls.length, 3);
  assert(calls.every(([, force]) => force === true));
  pending.resolve();
  await done;
});
