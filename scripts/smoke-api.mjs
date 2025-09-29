/* Simple API smoke test mirroring the Postman collection */
const BASE = 'http://localhost:4000';

async function req(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(BASE + path, { ...options, headers });
  let body = null;
  try { body = await res.json(); } catch {}
  return { status: res.status, body };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  // Login - Success
  const login = await req('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test', password: 'password' }),
  });
  assert(login.status === 200, `Login expected 200, got ${login.status}`);
  assert(login.body?.token, 'Login missing token');
  assert(login.body?.user?.id, 'Login missing user.id');
  const token = login.body.token;

  // GET Items - Unauthorized
  const unauth = await req('/api/items');
  assert(unauth.status === 401, `GET items unauth expected 401, got ${unauth.status}`);
  assert(unauth.body?.error === 'Unauthorized', 'Unauthorized error mismatch');

  // GET Items - Authorized
  const list1 = await req('/api/items', { headers: { Authorization: `Bearer ${token}` } });
  assert(list1.status === 200, `GET items auth expected 200, got ${list1.status}`);
  assert(Array.isArray(list1.body?.items), 'Items should be an array');

  // POST Item - Success
  const create = await req('/api/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: 'My first item' }),
  });
  assert(create.status === 201, `POST item expected 201, got ${create.status}`);
  assert(create.body?.item?.id, 'Created item missing id');
  const itemId = create.body.item.id;

  // POST Item - Error Empty Text
  const badCreate = await req('/api/items', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: '' }),
  });
  assert(badCreate.status === 400, `POST item empty expected 400, got ${badCreate.status}`);
  assert(badCreate.body?.error === 'Text required', 'Bad create error mismatch');

  // DELETE Item - Success
  const del = await req(`/api/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert(del.status === 200, `DELETE expected 200, got ${del.status}`);
  assert(del.body?.ok === true, 'Delete ok should be true');

  console.log('API smoke tests passed');
}

main().catch((e) => {
  console.error('API smoke tests failed:', e?.stack || e);
  process.exit(1);
});
