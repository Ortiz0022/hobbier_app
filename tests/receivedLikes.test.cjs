const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.join(__dirname, '..');
const compile = (file) => babel.transformSync(fs.readFileSync(path.join(root,file), 'utf8'), {
  configFile: false, babelrc: false, plugins: [require('@babel/plugin-transform-modules-commonjs')],
}).code;
const serviceCode = compile('src/services/receivedLikesService.js');
const hookCode = compile('src/features/feed/hooks/useReceivedLikes.js');
const plain = (value) => JSON.parse(JSON.stringify(value));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const flush = () => new Promise((done) => setImmediate(done));

function service(result) {
  const calls = [];
  const query = {};
  for (const method of ['select','eq','order','or','limit']) query[method] = (...args) => { calls.push([method,...args]); return query; };
  query.then = (resolve,reject) => Promise.resolve(result).then(resolve,reject);
  const exports = {};
  vm.runInNewContext(serviceCode, { exports, Date, console: { error() {} }, require: () => ({ supabase: {
    from: (name) => { calls.push(['from',name]); return query; },
  } }) });
  return { load: exports.getReceivedLikes, calls };
}
const row = (n) => ({ id: `00000000-0000-0000-0000-${String(n).padStart(12,'0')}`, created_at: '2026-11-04T12:00:00.123456+00:00', liker: { id: 'liker' }, post: { id:'post' } });
const page = (ids, more = false) => ({ reactions: ids.map(row), hasMore: more, nextCursor: more ? row(ids[ids.length-1]) : null, error: null });

test('received likes only queries the current user\'s active posts, newest first', async () => {
  const s = service({ data:[row(1)], error:null });
  const result = await s.load('alice');
  assert.equal(result.reactions.length,1);
  assert(s.calls.some(([method,column,value]) => method==='eq' && column==='post.user_id' && value==='alice'));
  assert(s.calls.some(([method,column,value]) => method==='eq' && column==='post.status' && value==='ACTIVE'));
  assert.match(s.calls.find(([method])=>method==='select')[1], /post:posts!inner/);
  assert.deepEqual(s.calls.filter(([method])=>method==='order').map(([,column,options])=>[column,options.ascending]), [['created_at',false],['id',false]]);
});
test('no session never queries reactions', async () => {
  const s = service({ data:[row(1)] });
  const result = await s.load(null);
  assert.equal(result.reactions.length,0); assert.equal(s.calls.length,0);
});
test('a full page returns a stable cursor and keeps the lookahead row for the next page', async () => {
  const s = service({ data:Array.from({length:21},(_,i)=>row(21-i)), error:null });
  const result = await s.load('alice');
  assert.equal(result.reactions.length,20); assert.equal(result.hasMore,true);
  assert.deepEqual(plain(result.nextCursor), { id:row(2).id, created_at:row(2).created_at });
  assert.deepEqual(s.calls.find(([method])=>method==='limit'), ['limit',21]);
});
test('pagination preserves PostgreSQL microseconds and uses the reaction id to break ties', async () => {
  const s = service({data:[row(1)],error:null});
  await s.load('alice',{ before:row(2) });
  assert.equal(s.calls.find(([method])=>method==='or')[1], `created_at.lt.${row(2).created_at},and(created_at.eq.${row(2).created_at},id.lt.${row(2).id})`);
});
test('a malformed cursor cannot become a PostgREST filter', async () => {
  const s = service({data:[],error:null});
  const result = await s.load('alice',{before:{id:'unsafe),user_id.neq.alice',created_at:row(1).created_at}});
  assert(result.error); assert(!s.calls.some(([method])=>method==='or'));
});
test('empty results end pagination and request failures stay errors', async () => {
  const empty = await service({data:[],error:null}).load('alice');
  assert.equal(empty.hasMore,false); assert.equal(empty.nextCursor,null); assert.equal(empty.error,null);
  const failure = Error('offline');
  const failed = await service({data:[row(1)],error:failure}).load('alice');
  assert.equal(failed.error,failure); assert.equal(failed.reactions.length,0);
});

function hook(fetch, userId='alice') {
  const states=[], refs=[], effects=[];
  const react = {
    useState(initial) { const box={value:initial}; states.push(box); return [initial,(next)=>{ box.value=typeof next==='function'?next(box.value):next; }]; },
    useRef(value) { const ref={current:value}; refs.push(ref); return ref; },
    useCallback(fn) { return fn; }, useEffect(effect) { effects.push(effect); },
  };
  const exports={};
  vm.runInNewContext(hookCode,{exports, require:(name)=>name==='react'?react:{getReceivedLikes:fetch}});
  const api=exports.useReceivedLikes(userId);
  const cleanup=effects[0]();
  return {api,cleanup, ids:()=>Array.from(states[0].value,(r)=>r.id), loading:()=>states[1].value, moreError:()=>states[4].value};
}
test('refresh replaces the registry so removed likes disappear', async () => {
  let calls=0;
  const h=hook(async()=>++calls===1?page([2,1]):page([2]));
  await flush(); assert.deepEqual(h.ids(),[row(2).id,row(1).id]);
  await h.api.refetch(); assert.deepEqual(h.ids(),[row(2).id]);
});
test('simultaneous page requests are shared and duplicate rows never appear twice', async () => {
  const pending=deferred(); let calls=0;
  const h=hook(async()=>++calls===1?page([3,2],true):pending.promise);
  await flush(); const first=h.api.loadMore(); const duplicate=h.api.loadMore();
  assert.equal(calls,2);
  pending.resolve(page([2,1])); await Promise.all([first,duplicate]);
  assert.deepEqual(h.ids(),[row(3).id,row(2).id,row(1).id]);
});
test('an older page cannot overwrite a refreshed registry', async () => {
  const old=deferred(); let calls=0;
  const h=hook(async()=>{ calls++; return calls===1?page([3],true):calls===2?old.promise:page([9]); });
  await flush(); const loading=h.api.loadMore(); await h.api.refetch();
  old.resolve(page([2])); await loading;
  assert.deepEqual(h.ids(),[row(9).id]);
});
test('responses arriving after leaving the screen cannot repopulate it', async () => {
  const old=deferred(); const h=hook(()=>old.promise);
  h.cleanup(); old.resolve(page([1])); await flush();
  assert.deepEqual(h.ids(),[]);
});
test('failed pagination preserves existing likes and retries the same cursor', async () => {
  let calls=0; const cursors=[];
  const h=hook(async(_id,{before})=>{ cursors.push(before); calls++; return calls===1?page([3],true):calls===2?{error:Error('offline')}:page([2]); });
  await flush(); await h.api.loadMore();
  assert(h.moreError()); assert.deepEqual(h.ids(),[row(3).id]);
  await h.api.loadMore(); assert.deepEqual(plain(cursors[1]),plain(cursors[2]));
  assert.deepEqual(h.ids(),[row(3).id,row(2).id]);
});
test('the registry performs no requests without an authenticated user', async () => {
  let calls=0; const h=hook(async()=>{calls++; return page([1]);},null);
  await flush(); assert.equal(calls,0); assert.equal(h.loading(),false); assert.deepEqual(h.ids(),[]);
});
