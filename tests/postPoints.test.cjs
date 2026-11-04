// PostgreSQL real en memoria. Para ejecutarlo sin añadir dependencias a la app:
// npm install --prefix <carpeta-temporal> --no-save @electric-sql/pglite
// PGLITE_MODULE=<carpeta-temporal>/node_modules/@electric-sql/pglite node --test tests/postPoints.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const root = path.join(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/20261104_post_points_on_delete.sql'), 'utf8');
const deleteOwn = fs.readFileSync(path.join(root, 'supabase/migrations/20261005b_delete_own_post.sql'), 'utf8');
const A = '00000000-0000-0000-0000-000000000001';
const B = '00000000-0000-0000-0000-000000000002';
const ACT = '10000000-0000-0000-0000-000000000001';
const UA = '20000000-0000-0000-0000-000000000001';
const LEGACY_UA = '20000000-0000-0000-0000-000000000002';
const LEGACY = ['30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003'];

test('post points: eliminación y restauración transaccionales', async (t) => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$
      SELECT NULLIF(current_setting('app.user_id', true), '')::UUID;
    $$;
    CREATE TABLE public.profiles(id UUID PRIMARY KEY, points INT NOT NULL DEFAULT 0 CHECK(points >= 0), updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE public.activities(id UUID PRIMARY KEY, points_awarded INT NOT NULL CHECK(points_awarded > 0));
    CREATE TABLE public.user_activities(
      id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'PENDING', completed_at TIMESTAMPTZ, points_awarded INT DEFAULT 0
    );
    CREATE TABLE public.posts(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(), user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      user_activity_id UUID NOT NULL REFERENCES user_activities(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','REPORTED','DELETED')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO profiles(id,points) VALUES ('${A}',0),('${B}',31);
    INSERT INTO activities VALUES ('${ACT}',10);
    INSERT INTO user_activities(id,user_id,activity_id,points_awarded) VALUES ('${UA}','${A}','${ACT}',0),('${LEGACY_UA}','${B}','${ACT}',31);
    INSERT INTO posts(id,user_id,user_activity_id,image_url,status) VALUES
      ('${LEGACY[0]}','${B}','${LEGACY_UA}','old1','ACTIVE'),
      ('${LEGACY[1]}','${B}','${LEGACY_UA}','old2','REPORTED'),
      ('${LEGACY[2]}','${B}','${LEGACY_UA}','old3','DELETED');
    SELECT set_config('app.user_id','${A}',false);
  `);
  await db.exec(migration);
  await db.exec(deleteOwn);
  const balance = async (id = A) => (await db.query('SELECT points FROM profiles WHERE id=$1', [id])).rows[0]?.points;
  const activityBalance = async () => (await db.query('SELECT points_awarded FROM user_activities WHERE id=$1', [UA])).rows[0]?.points_awarded;
  const postState = async (id) => (await db.query('SELECT status FROM posts WHERE id=$1', [id])).rows[0]?.status;
  const publish = async () => (await db.query("SELECT log_activity_progress($1, 'photo') AS result", [UA])).rows[0].result.post_id;
  const status = (id, s) => db.query('UPDATE posts SET status=$2 WHERE id=$1', [id,s]);
  const scenario = (name, run) => t.test(name, async () => {
    await db.exec('BEGIN');
    try { await run(); } finally { await db.exec('ROLLBACK'); }
  });

  await scenario('historial conserva exactamente su acumulado y no altera puntos anteriores', async () => {
    assert.deepEqual((await db.query('SELECT points_awarded FROM post_point_awards ORDER BY post_id')).rows.map(x=>x.points_awarded), [11,10,10]);
    assert.equal(await balance(B), 31);
    await status(LEGACY[2], 'ACTIVE');
    assert.equal(await balance(B), 31, 'restaurar una foto antigua nunca descontada no regala puntos');
  });
  await scenario('repeticiones guardan su valor original aunque cambie el catálogo', async () => {
    const first = await publish();
    await db.query('UPDATE activities SET points_awarded=25 WHERE id=$1', [ACT]);
    await publish();
    await db.query('UPDATE activities SET points_awarded=200 WHERE id=$1', [ACT]);
    await db.query('SELECT delete_own_post($1)', [first]);
    assert.equal(await balance(), 25);
    assert.equal(await activityBalance(), 25);
    assert.equal(await balance(B), 31);
  });
  await scenario('admin descuenta solo al eliminar, no al reportar ni al repetir la resolución', async () => {
    const id = await publish();
    await status(id, 'REPORTED'); assert.equal(await balance(), 10);
    await status(id, 'ACTIVE'); assert.equal(await balance(), 10);
    await status(id, 'DELETED'); assert.equal(await balance(), 0);
    await status(id, 'DELETED'); assert.equal(await balance(), 0);
    assert.equal(await activityBalance(), 0);
  });
  await scenario('restauración devuelve exactamente los puntos, una sola vez', async () => {
    const id = await publish();
    await status(id, 'DELETED');
    await db.query('UPDATE activities SET points_awarded=50 WHERE id=$1', [ACT]);
    await status(id, 'ACTIVE'); await status(id, 'ACTIVE');
    assert.equal(await balance(), 10); assert.equal(await activityBalance(), 10);
    await status(id, 'DELETED'); assert.equal(await balance(), 0);
  });
  await scenario('borrado físico de una foto activa descuenta sus puntos', async () => {
    const id = await publish(); await publish();
    await db.query('DELETE FROM posts WHERE id=$1',[id]);
    assert.equal(await balance(), 10); assert.equal(await activityBalance(), 10);
  });
  await scenario('borrado físico después del lógico no duplica el descuento', async () => {
    const id = await publish(); await publish();
    await status(id, 'DELETED'); await db.query('DELETE FROM posts WHERE id=$1',[id]);
    assert.equal(await balance(), 10); assert.equal(await activityBalance(), 10);
  });
  await scenario('los puntos nunca quedan negativos aunque el acumulado sea inconsistente', async () => {
    const id = await publish();
    await db.query('UPDATE profiles SET points=3 WHERE id=$1',[A]);
    await db.query('UPDATE user_activities SET points_awarded=3 WHERE id=$1',[UA]);
    await status(id,'DELETED');
    assert.equal(await balance(),0); assert.equal(await activityBalance(),0);
  });
  // Una sentencia que falla aborta la transacción: SAVEPOINT permite verificar el estado.
  await scenario('fallar al actualizar el saldo revierte también la eliminación y el registro contable', async () => {
    const id = await publish();
    await db.exec(`CREATE FUNCTION fail_points_test() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fallo simulado'; END $$;
      CREATE TRIGGER fail_points_test BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION fail_points_test();
      SAVEPOINT before_failure;`);
    await assert.rejects(status(id,'DELETED'), /fallo simulado/);
    await db.exec('ROLLBACK TO SAVEPOINT before_failure');
    assert.equal(await postState(id),'ACTIVE'); assert.equal(await balance(),10);
    assert.equal((await db.query('SELECT counted FROM post_point_awards WHERE post_id=$1',[id])).rows[0].counted,true);
  });
  await scenario('el borrado en cascada de una actividad descuenta todas sus publicaciones', async () => {
    await publish(); await publish();
    await db.query('DELETE FROM user_activities WHERE id=$1',[UA]);
    assert.equal(await balance(),0);
  });
  await scenario('el borrado en cascada del perfil no intenta recrearlo', async () => {
    await publish();
    await db.query('DELETE FROM profiles WHERE id=$1',[A]);
    assert.equal(await balance(),undefined);
  });
  await scenario('no se puede eliminar una publicación ajena ni sin sesión', async () => {
    const id = await publish();
    await db.query("SELECT set_config('app.user_id',$1,true)",[B]);
    await db.exec('SAVEPOINT forbidden');
    await assert.rejects(db.query('SELECT delete_own_post($1)',[id]),/Solo puedes/);
    await db.exec('ROLLBACK TO SAVEPOINT forbidden');
    await db.query("SELECT set_config('app.user_id','',true)");
    await db.exec('SAVEPOINT no_session');
    await assert.rejects(db.query('SELECT delete_own_post($1)',[id]),/iniciar sesión/);
    await db.exec('ROLLBACK TO SAVEPOINT no_session');
    assert.equal(await postState(id),'ACTIVE'); assert.equal(await balance(),10);
  });
  await scenario('los clientes no pueden falsificar el registro contable', async () => {
    const id = await publish();
    await db.exec('SET LOCAL ROLE authenticated; SAVEPOINT protected_ledger;');
    await assert.rejects(db.query('UPDATE post_point_awards SET points_awarded=500 WHERE post_id=$1',[id]),/permission denied/);
    await db.exec('ROLLBACK TO SAVEPOINT protected_ledger; RESET ROLE;');
    assert.equal((await db.query('SELECT points_awarded FROM post_point_awards WHERE post_id=$1',[id])).rows[0].points_awarded,10);
  });
  // Reaplicar una migración no debe reconstruir ni reactivar registros ya descontados.
  const deleted = await publish(); await status(deleted,'DELETED');
  await db.exec(migration);
  assert.equal(await balance(),0);
  assert.equal((await db.query('SELECT counted FROM post_point_awards WHERE post_id=$1',[deleted])).rows[0].counted,false);
});
