// PostgreSQL real en memoria. Para ejecutarlo sin añadir dependencias a la app:
// npm install --prefix <carpeta-temporal> --no-save @electric-sql/pglite
// PGLITE_MODULE=<carpeta-temporal>/node_modules/@electric-sql/pglite node --test tests/profileSecurity.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');

const root = path.join(__dirname, '..');
const leer = (nombre) => fs.readFileSync(path.join(root, 'supabase/migrations', nombre), 'utf8');
const USER = '00000000-0000-0000-0000-000000000001';
const OTRO = '00000000-0000-0000-0000-000000000002';
const ADMIN = '00000000-0000-0000-0000-000000000003';

const crearBase = async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA auth, public TO anon, authenticated;
    CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE SQL AS $$
      SELECT NULLIF(current_setting('app.user_id', true), '')::UUID;
    $$;
    CREATE TABLE auth.users(id UUID PRIMARY KEY, raw_user_meta_data JSONB);
    CREATE TABLE public.profiles(
      id UUID PRIMARY KEY, full_name TEXT NOT NULL, username TEXT UNIQUE NOT NULL,
      birth_date DATE NOT NULL DEFAULT '2000-01-01', avatar_url TEXT,
      points INT NOT NULL DEFAULT 0, role TEXT NOT NULL DEFAULT 'USER',
      status TEXT NOT NULL DEFAULT 'ACTIVE', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), suspended_until TIMESTAMPTZ,
      ban_reason TEXT, banned_at TIMESTAMPTZ, ads_personalized BOOLEAN, ads_city TEXT
    );
    GRANT ALL ON TABLE public.profiles TO anon, authenticated;
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Ver perfiles" ON public.profiles FOR SELECT USING (true);
    CREATE POLICY "Editar perfil propio" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Admin editar perfiles" ON public.profiles FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'ADMIN')
    );
    CREATE TABLE public.activities(id INT PRIMARY KEY);
    GRANT SELECT ON TABLE public.activities TO anon, authenticated;
    ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Ver actividades" ON public.activities FOR SELECT USING (
      id = 1 OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
    );
    INSERT INTO public.activities VALUES (1);
    CREATE TABLE public.profile_reports(
      id SERIAL PRIMARY KEY, reporter_id UUID, reported_profile_id UUID, reason TEXT
    );
    INSERT INTO public.profiles(id, full_name, username, role) VALUES
      ('${USER}', 'Ana', 'ana', 'USER'),
      ('${OTRO}', 'Beto', 'beto', 'USER'),
      ('${ADMIN}', 'Admin', 'admin', 'ADMIN');
    CREATE FUNCTION public.dar_puntos(p UUID) RETURNS VOID AS $$
      UPDATE public.profiles SET points = points + 10 WHERE id = p;
    $$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
    GRANT EXECUTE ON FUNCTION public.dar_puntos TO authenticated;
  `);
  await db.exec(leer('20261104b_profile_security.sql'));
  await db.exec(`
    CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    CREATE TRIGGER on_profile_reported AFTER INSERT ON public.profile_reports
      FOR EACH ROW EXECUTE FUNCTION public.suspend_reported_profile();
  `);
  return db;
};

const como = async (db, rol, uid, sql) => {
  await db.exec(`SET app.user_id = '${uid || ''}'; SET ROLE ${rol};`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec('RESET ROLE;');
  }
};

const valor = async (db, columna, id) =>
  (await db.query(`SELECT ${columna} AS v FROM public.profiles WHERE id = '${id}'`)).rows[0].v;

test('una cuenta edita sus datos, pero no su rol, puntos, sanción ni fecha', async (t) => {
  const db = await crearBase();
  t.after(() => db.close());

  await como(db, 'authenticated', USER, `UPDATE public.profiles SET full_name = 'Ana B', ads_city = 'Nicoya' WHERE id = '${USER}'`);
  assert.equal(await valor(db, 'full_name', USER), 'Ana B');

  for (const cambio of ["role = 'ADMIN'", 'points = 9999', "status = 'BANNED'", 'suspended_until = NOW()', "ban_reason = 'x'", "birth_date = '1990-01-01'"]) {
    await assert.rejects(
      como(db, 'authenticated', USER, `UPDATE public.profiles SET ${cambio} WHERE id = '${USER}'`),
      /solo|Solo/,
      cambio
    );
  }
  assert.equal(await valor(db, 'role', USER), 'USER');
  assert.equal(await valor(db, 'points', USER), 0);
});

test('el panel sigue pudiendo cambiar roles y sanciones, y el servidor dar puntos', async (t) => {
  const db = await crearBase();
  t.after(() => db.close());

  await como(db, 'authenticated', ADMIN, `UPDATE public.profiles SET status = 'BANNED', ban_reason = 'motivo largo' WHERE id = '${USER}'`);
  assert.equal(await valor(db, 'status', USER), 'BANNED');
  await como(db, 'authenticated', ADMIN, `UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${OTRO}'`);
  assert.equal(await valor(db, 'role', OTRO), 'ADMIN');
  await assert.rejects(como(db, 'authenticated', ADMIN, `UPDATE public.profiles SET points = 5 WHERE id = '${USER}'`), /servidor/);

  await como(db, 'authenticated', USER, `SELECT public.dar_puntos('${USER}')`);
  assert.equal(await valor(db, 'points', USER), 10);
});

test('registrarse pidiendo el rol ADMIN crea una cuenta normal', async (t) => {
  const db = await crearBase();
  t.after(() => db.close());
  const id = '00000000-0000-0000-0000-000000000009';
  await db.query(`INSERT INTO auth.users VALUES ($1, $2)`, [id, JSON.stringify({ username: 'Nueva', role: 'ADMIN' })]);
  assert.equal(await valor(db, 'role', id), 'USER');
  assert.equal(await valor(db, 'username', id), 'nueva');
});

test('sin sesión solo se comprueba el usuario y las políticas siguen funcionando', async (t) => {
  const db = await crearBase();
  t.after(() => db.close());

  const libres = await como(db, 'anon', null, `SELECT id FROM public.profiles WHERE username ILIKE 'ana'`);
  assert.equal(libres.rows.length, 1);
  assert.equal((await como(db, 'anon', null, 'SELECT id FROM public.activities')).rows.length, 1);
  for (const columna of ['birth_date', 'points', 'status', 'full_name', '*']) {
    await assert.rejects(como(db, 'anon', null, `SELECT ${columna} FROM public.profiles`), /permission denied/, columna);
  }
  await assert.rejects(como(db, 'anon', null, `UPDATE public.profiles SET full_name = 'x'`), /permission denied/);
});

test('un reporte sanciona a una cuenta normal, no a un admin ni a quien se reporta a sí mismo', async (t) => {
  const db = await crearBase();
  t.after(() => db.close());

  await db.exec(`INSERT INTO public.profile_reports(reporter_id, reported_profile_id, reason) VALUES
    ('${USER}', '${ADMIN}', 'abuso'), ('${USER}', '${USER}', 'abuso')`);
  assert.equal(await valor(db, 'status', ADMIN), 'ACTIVE');
  assert.equal(await valor(db, 'status', USER), 'ACTIVE');

  await db.exec(`INSERT INTO public.profile_reports(reporter_id, reported_profile_id, reason) VALUES ('${USER}', '${OTRO}', 'abuso')`);
  assert.equal(await valor(db, 'status', OTRO), 'BANNED');
  assert.match(await valor(db, 'ban_reason', OTRO), /abuso/);
});

test('la fecha de nacimiento queda oculta sin romper lo que usa la app', async (t) => {
  const db = await crearBase();
  t.after(() => db.close());
  await db.exec(leer('20261104c_hide_birth_date.sql'));

  await assert.rejects(como(db, 'authenticated', USER, `SELECT birth_date FROM public.profiles`), /permission denied/);
  await assert.rejects(como(db, 'authenticated', USER, `SELECT * FROM public.profiles`), /permission denied/);

  const appSrc = fs.readFileSync(path.join(root, 'src/context/AuthContext.js'), 'utf8');
  const columnas = appSrc.match(/PROFILE_COLUMNS\s*=\s*\n?\s*'([^']+)'/)[1];
  const perfil = await como(db, 'authenticated', USER, `SELECT ${columnas} FROM public.profiles WHERE id = '${USER}'`);
  assert.equal(perfil.rows[0].username, 'ana');
  assert.equal(perfil.rows[0].birth_date, undefined);

  await como(db, 'authenticated', USER, `UPDATE public.profiles SET full_name = 'Ana C' WHERE id = '${USER}'`);
  assert.equal(await valor(db, 'full_name', USER), 'Ana C');
  await como(db, 'authenticated', ADMIN, `UPDATE public.profiles SET role = 'ADMIN' WHERE id = '${USER}' RETURNING id, role`);
  assert.equal(await valor(db, 'role', USER), 'ADMIN');
});
