import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

// In-memory data
let users = [{ id: 1, username: 'test', password: 'password', name: 'Test User' }];
let sessions = new Map(); // token -> userId
let itemsByUser = new Map(); // userId -> items array

const genToken = () => Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

// Middleware to auth
function auth(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '') || '';
  const userId = sessions.get(token);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = userId;
  next();
}

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = genToken();
  sessions.set(token, user.id);
  if (!itemsByUser.has(user.id)) itemsByUser.set(user.id, []);
  res.json({ token, user: { id: user.id, name: user.name, username: user.username } });
});

app.get('/api/items', auth, (req, res) => {
  res.json({ items: itemsByUser.get(req.userId) || [] });
});

app.post('/api/items', auth, (req, res) => {
  const { text } = req.body || {};
  if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });
  const list = itemsByUser.get(req.userId) || [];
  const item = { id: Date.now().toString(), text: text.trim() };
  list.push(item);
  itemsByUser.set(req.userId, list);
  res.status(201).json({ item });
});

app.delete('/api/items/:id', auth, (req, res) => {
  const list = itemsByUser.get(req.userId) || [];
  const next = list.filter(i => i.id !== req.params.id);
  itemsByUser.set(req.userId, next);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
