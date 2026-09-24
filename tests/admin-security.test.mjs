import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';

// Run the real TypeScript handlers and guard, replacing only external services.
// No production users are invited, deleted, or modified by these tests.
function harness(authResult, options = {}) {
  const calls = [];
  let clientOptions;
  const operation = (name, data) => async (...args) => {
    calls.push({ name, args });
    return { data, error: options.operationError || null };
  };
  const query = {
    select() { return this; },
    eq() { return this; },
    maybeSingle: async () => ({ data: options.missingRequest ? null : { id: 'request-1' }, error: null }),
    update(value) { calls.push({ name: 'update', args: [value] }); return this; },
    then(resolve) { return Promise.resolve({ error: null }).then(resolve); },
  };
  const admin = {
    auth: { admin: {
      listUsers: operation('listUsers', { users: [{ id: 'user-1', email: 'member@example.com', app_metadata: { secret: true } }] }),
      deleteUser: operation('deleteUser', {}),
      inviteUserByEmail: operation('inviteUserByEmail', {}),
      generateLink: operation('generateLink', { properties: { action_link: 'https://example.com/secret-link' } }),
    } },
    from: () => query,
  };
  const mocks = {
    'server-only': {},
    '@/lib/supabase/server': { createClient: async () => ({ auth: {
      getUser: async () => {
        calls.push({ name: 'getUser' });
        if (options.authThrows) throw new Error('Auth unavailable');
        return authResult;
      },
    } }) },
    '@supabase/supabase-js': { createClient: (...args) => {
      calls.push({ name: 'createAdminClient' });
      clientOptions = args[2];
      return admin;
    } },
    'next/server': { NextResponse: Response },
    resend: { Resend: class { emails = { send: operation('sendEmail', {}) }; } },
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const loadedModule = { exports: {} };
    cache.set(file, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const requireMock = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.startsWith('@/')) return load(`src/${name.slice(2)}.ts`);
      throw new Error(`Unexpected dependency: ${name}`);
    };
    vm.runInNewContext(code, {
      module: loadedModule, exports: loadedModule.exports, require: requireMock,
      Response, Request, URL, process: { env: {} },
      console: { log() { throw new Error('Unexpected sensitive log'); }, error() { throw new Error('Unexpected sensitive log'); } },
    }, { filename: file });
    return loadedModule.exports;
  }
  return { load, calls, get clientOptions() { return clientOptions; } };
}

const member = { id: 'member', app_metadata: { role: 'member' } };
const administrator = { id: 'admin', app_metadata: { role: 'admin' } };
const result = (user, error = null) => ({ data: { user }, error });
const routes = [
  ['GET', 'src/app/api/admin/users/route.ts', undefined, 'listUsers'],
  ['DELETE', 'src/app/api/admin/users/route.ts', { userId: '12345678-1234-1234-1234-123456789abc' }, 'deleteUser'],
  ['POST', 'src/app/api/admin/invite/route.ts', { email: 'new@example.com', requestId: 'request-1' }, 'generateLink'],
  ['POST', 'src/app/api/invite-user/route.tsx', { email: 'new@example.com' }, 'inviteUserByEmail'],
];
function request(method, body, headers = {}) {
  return new Request('https://app.example.com/api/admin', {
    method, headers: { 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
  });
}

for (const [method, file, body, operation] of routes) {
  const label = `${method} ${file}`;
  for (const [name, auth, status, options] of [
    ['anonymous', result(null), 401],
    ['invalid session', result(administrator, { message: 'Invalid token' }), 401],
    ['ordinary member', result(member), 403],
    ['forged user_metadata role', result({ ...member, user_metadata: { role: 'admin' } }), 403],
    ['missing app_metadata', result({ id: 'member' }), 403],
    ['Auth outage', result(null), 503, { authThrows: true }],
  ]) {
    test(`${label}: denies ${name} before privileged operations`, async () => {
      const h = harness(auth, options);
      const response = await h.load(file)[method](request(method, body));
      assert.equal(response.status, status);
      assert.deepEqual(h.calls.map(c => c.name), ['getUser']);
    });
  }
  test(`${label}: permits verified administrator`, async () => {
    const h = harness(result(administrator));
    const response = await h.load(file)[method](request(method, body));
    assert.equal(response.status, 200);
    assert.equal(h.calls[0].name, 'getUser');
    assert.equal(h.calls[1].name, 'createAdminClient');
    assert.ok(h.calls.some(c => c.name === operation));
    assert.equal(h.clientOptions.auth.persistSession, false);
    assert.equal(h.clientOptions.auth.autoRefreshToken, false);
    if (method === 'GET') {
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal((await response.json()).users[0].app_metadata, undefined);
    }
  });
  test(`${label}: hides upstream error details`, async () => {
    const h = harness(result(administrator), { operationError: { message: 'sensitive upstream detail' } });
    const response = await h.load(file)[method](request(method, body));
    assert.ok(response.status >= 400);
    assert.ok(!(await response.text()).includes('sensitive upstream detail'));
  });
  if (method !== 'GET') {
    for (const headers of [{ origin: 'https://evil.example.com' }, { 'sec-fetch-site': 'cross-site' }]) {
      test(`${label}: rejects cross-site mutation ${JSON.stringify(headers)}`, async () => {
        const h = harness(result(administrator));
        const response = await h.load(file)[method](request(method, body, headers));
        assert.equal(response.status, 403);
        assert.equal(h.calls.length, 0);
      });
    }
    for (const invalid of ['{', 'null', '{}']) {
      test(`${label}: rejects invalid body ${invalid}`, async () => {
        const h = harness(result(administrator));
        const response = await h.load(file)[method](request(method, invalid));
        assert.equal(response.status, 400);
        assert.deepEqual(h.calls.map(c => c.name), ['getUser']);
      });
    }
  }
}

test('Invitation must match a pending access request before generating a link or sending email', async () => {
  const h = harness(result(administrator), { missingRequest: true });
  const response = await h.load(routes[2][1]).POST(request('POST', routes[2][2]));
  assert.equal(response.status, 404);
  assert.deepEqual(h.calls.map(c => c.name), ['getUser', 'createAdminClient']);
});

test('Revoked admin role is rechecked on each request', async () => {
  const auth = result(administrator);
  const h = harness(auth);
  const { GET } = h.load(routes[0][1]);
  assert.equal((await GET(request('GET'))).status, 200);
  auth.data.user = member;
  h.calls.length = 0;
  assert.equal((await GET(request('GET'))).status, 403);
  assert.deepEqual(h.calls.map(c => c.name), ['getUser']);
});
