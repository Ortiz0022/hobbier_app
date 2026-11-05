const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const root = path.join(__dirname, '..');
const code = babel.transformSync(fs.readFileSync(path.join(root,'src/context/AuthContext.js'),'utf8'), {
  configFile:false, babelrc:false,
  plugins:[require('@babel/plugin-transform-react-jsx'), require('@babel/plugin-transform-modules-commonjs')],
}).code;
const deferred = () => { let resolve; const promise=new Promise((done)=>{resolve=done;}); return {promise,resolve}; };
const tick = () => new Promise((done)=>setImmediate(done));
const session = (id='alice', extra={}) => ({user:{id,...extra},access_token:'token'});

function provider(options={}) {
  const hooks=[], effects=[], requests=[], invalidations=[];
  let cursor=0, dirty=true, value, listener;
  const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
  const react={
    createContext:()=>({Provider:'provider'}), createElement:(_type,props)=>({props}),
    useState(initial) {
      const i=cursor++;
      if(!hooks[i]) {
        const slot={value:typeof initial==='function'?initial():initial};
        slot.set=(next)=>{const v=typeof next==='function'?next(slot.value):next; if(!Object.is(v,slot.value)){slot.value=v;dirty=true;}};
        hooks[i]=slot;
      }
      return [hooks[i].value,hooks[i].set];
    },
    useRef(initial) { const i=cursor++; return hooks[i]||(hooks[i]={current:initial}); },
    useCallback(fn,deps) { const i=cursor++; if(!hooks[i]||!same(hooks[i].deps,deps))hooks[i]={fn,deps}; return hooks[i].fn; },
    useEffect(fn,deps) { const i=cursor++; if(!hooks[i]||!same(hooks[i].deps,deps)){const previous=hooks[i];hooks[i]={deps,cleanup:previous?.cleanup}; effects.push(()=>{hooks[i].cleanup?.();hooks[i].cleanup=fn();});} },
  };
  const auth={
    onAuthStateChange(fn) { listener=fn; return {data:{subscription:{unsubscribe(){}}}}; },
    getSession: async()=>{requests.push(['getSession']); return {data:{session:null}};},
    async signInWithPassword() {
      if(options.signInError)return {data:null,error:options.signInError};
      listener('SIGNED_IN',session());return {data:{user:{id:'alice'},session:session()},error:null};
    },
    async signUp() {return {data:{user:{id:'alice'},session:null},error:null};},
    async signOut() {listener('SIGNED_OUT',null);return {error:null};},
  };
  const supabase={auth,
    rpc(name) {requests.push(['rpc',name]);return options.suspension?options.suspension():Promise.resolve({data:[],error:null});},
    from(table) {
      let id;
      const query={select(){return query;},eq(_column,value){id=value;return query;},
        single(){requests.push(['profile',id]);return options.profile?options.profile(id):Promise.resolve({data:{id,points:10,status:'ACTIVE'},error:null});},
      };return query;
    },
  };
  const exports={};
  vm.runInNewContext(code,{exports,console:{error(){},warn(){}},setInterval:()=>1,clearInterval(){},require(name){
    if(name==='react')return react;
    if(name==='react-native')return {AppState:{addEventListener:()=>({remove(){}})}};
    if(name==='../config/supabase')return {supabase,getRedirectUrl:()=>''};
    if(name==='../legal/legalContent')return {LEGAL_VERSION:'test'};
    if(name==='../services/queryCache')return {setQueryCacheUser(){},invalidateQueries:(...tags)=>invalidations.push(tags)};
    throw Error(name);
  }});
  function render() {
    let count=0;
    while(dirty||effects.length){assert(count++<20,'no render loop');dirty=false;cursor=0;value=exports.AuthProvider({children:null}).props.value;while(effects.length)effects.shift()();}
    return value;
  }
  async function settle(){for(let i=0;i<5;i++){render();await tick();}return render();}
  render();
  return {get value(){return render();},requests,invalidations,emit:(...args)=>listener(...args),render,settle};
}

test('auth listener returns immediately and profile/suspension queries run outside the callback', async()=>{
  const h=provider();
  assert.equal(h.emit('INITIAL_SESSION',session()),undefined);
  assert.equal(h.requests.length,0);
  h.render();
  assert.equal(h.requests.filter(([kind])=>kind==='profile').length,1);
  assert.equal(h.requests.filter(([kind])=>kind==='rpc').length,1);
  await h.settle();
  assert.equal(h.value.loading,false);assert.equal(h.value.user.id,'alice');
  assert.equal(h.requests.filter(([kind])=>kind==='getSession').length,0);
});
test('token renewal and repeated sign-in events do not reload or hide the same account',async()=>{
  const h=provider();h.emit('INITIAL_SESSION',session());await h.settle();
  const before=h.requests.length;
  for(const event of ['TOKEN_REFRESHED','SIGNED_IN','INITIAL_SESSION']){
    h.emit(event,{...session(),access_token:event});
    assert.equal(h.value.loading,false);await h.settle();
  }
  assert.equal(h.requests.length,before);
});
test('sign-in queries profile and suspension once instead of repeating listener work',async()=>{
  const h=provider();h.emit('INITIAL_SESSION',null);await h.settle();
  const result=await h.value.signIn({email:'alice@example.test',password:'valid'});
  assert.equal(result.error,null);await h.settle();
  assert.equal(h.requests.filter(([kind])=>kind==='profile').length,1);
  assert.equal(h.requests.filter(([kind])=>kind==='rpc').length,1);
});
test('failed login does not replace the login form with global loading',async()=>{
  const failure=Error('invalid credentials');const h=provider({signInError:failure});
  h.emit('INITIAL_SESSION',null);await h.settle();
  const result=await h.value.signIn({email:'alice@example.test',password:'wrong'});
  assert.equal(result.error,failure);assert.equal(h.value.loading,false);assert.equal(h.requests.length,0);
});
test('sign-up awaiting email confirmation does not fetch an unauthenticated profile',async()=>{
  const h=provider();h.emit('INITIAL_SESSION',null);await h.settle();
  const result=await h.value.signUp({email:'alice@example.test',password:'valid',fullName:'Alice',username:'alice',birthDate:'2000-01-01'});
  assert.equal(result.error,null);assert.equal(h.requests.length,0);assert.equal(h.value.user,null);
});
test('late profile and suspension responses cannot restore a signed-out account',async()=>{
  const profile=deferred(),suspension=deferred();const h=provider({profile:()=>profile.promise,suspension:()=>suspension.promise});
  h.emit('INITIAL_SESSION',session());h.render();
  h.emit('SIGNED_OUT',null);h.render();
  profile.resolve({data:{id:'alice',points:10},error:null});suspension.resolve({data:[{status:'BANNED'}],error:null});
  await h.settle();assert.equal(h.value.user,null);assert.equal(h.value.profile,null);assert.equal(h.value.suspension,null);assert.equal(h.value.loading,false);
});
test('an old account response cannot overwrite the new account while navigating',async()=>{
  const alice=deferred();const h=provider({profile:(id)=>id==='alice'?alice.promise:Promise.resolve({data:{id,points:30},error:null})});
  h.emit('INITIAL_SESSION',session());h.render();h.emit('SIGNED_IN',session('bob'));await h.settle();
  assert.equal(h.value.user.id,'bob');assert.equal(h.value.profile.id,'bob');
  alice.resolve({data:{id:'alice',points:999},error:null});await h.settle();
  assert.equal(h.value.user.id,'bob');assert.equal(h.value.profile.id,'bob');assert.equal(h.value.loading,false);
});
test('password recovery and suspension checks keep their existing account gates',async()=>{
  const h=provider({suspension:async()=>({data:[{status:'BANNED',suspended_until:null}],error:null})});
  h.emit('PASSWORD_RECOVERY',session());await h.settle();
  assert.equal(h.value.passwordRecovery,true);assert.equal(h.value.suspension.status,'BANNED');assert.equal(h.value.user.id,'alice');assert.equal(h.value.loading,false);
});
test('opening profile can refresh the balance without invalidating navigation caches',async()=>{
  const h=provider();h.emit('INITIAL_SESSION',session());await h.settle();
  await h.value.refreshProfile({invalidate:false});await h.settle();
  assert.equal(h.invalidations.length,0);assert.equal(h.value.profile.points,10);
  await h.value.refreshProfile();
  assert.deepEqual(h.invalidations.map((tags) => Array.from(tags)),[['social','feed']]);
});
test('a failed profile read releases initial loading and can be retried',async()=>{
  let fail=true;const h=provider({profile:async(id)=>fail?{data:null,error:Error('offline')}:{data:{id,points:20},error:null}});
  h.emit('INITIAL_SESSION',session());await h.settle();assert.equal(h.value.loading,false);
  fail=false;await h.value.refreshProfile({invalidate:false});await h.settle();assert.equal(h.value.profile.points,20);
});

test('a slower balance refresh cannot overwrite a newer points total',async()=>{
  const old=deferred(),current=deferred();let calls=0;
  const h=provider({profile:async(id)=>{calls++;return calls===1?{data:{id,points:10},error:null}:calls===2?old.promise:current.promise;}});
  h.emit('INITIAL_SESSION',session());await h.settle();
  const first=h.value.refreshProfile({invalidate:false});const latest=h.value.refreshProfile({invalidate:false});
  current.resolve({data:{id:'alice',points:25},error:null});await latest;await h.settle();
  old.resolve({data:{id:'alice',points:2},error:null});await first;await h.settle();
  assert.equal(h.value.profile.points,25);
});
