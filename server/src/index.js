import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from './models/User.js';
import { Item } from './models/Item.js';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enforce strict query parsing to avoid interpreting unexpected operators from user input
mongoose.set('strictQuery', true);

// Security: avoid disclosing framework/version via response headers
app.disable('x-powered-by');

// Allow primary dev origin and common fallback port (5174) used when 5173 is busy
const explicitOrigin = process.env.CLIENT_ORIGIN;
app.use(cors({
  origin: (origin, cb) => {
    // Allow non-browser / same-origin (no Origin header)
    if (!origin) return cb(null, true);
    // Allow explicitly configured origin
    if (explicitOrigin && origin === explicitOrigin) return cb(null, true);
    // Allow any localhost (dev/test convenience)
    if (/^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.use(express.json());

// In-memory session tokens (keep simple for now; tokens map to Mongo user _id)
let sessions = new Map(); // token -> userId(ObjectId string)

// ---- Token Generation ----
// ✅ Secure: cryptographically strong random tokens
const genToken = () => crypto.randomBytes(32).toString('hex');

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

// Removed uptime utility & /uptime endpoint

// ---- Registration ----
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, username, password } = req.body || {};
    // Validate types explicitly to prevent NoSQL operator injection
    const nameStr = typeof name === 'string' ? name.trim() : '';
    const usernameStr = typeof username === 'string' ? username.trim() : '';
    const passwordStr = typeof password === 'string' ? password.trim() : '';
    if (!nameStr || !usernameStr || !passwordStr) {
      return res.status(400).json({ error: 'Name, username and password are required' });
    }
    // Use $eq with validated string to avoid interpreting objects/operators from user input
    const exists = await User.findOne({ username: { $eq: usernameStr } }).exec();
    if (exists) return res.status(409).json({ error: 'Username already taken' });

    // ✅ Secure: hash password before storing
    const hashed = await bcrypt.hash(passwordStr, 12);
    const user = await User.create({
      name: nameStr,
      username: usernameStr,
      password: hashed,
    });

    const token = genToken();
    sessions.set(token, user._id.toString());
    return res.status(201).json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('Register error', err);
    if (err?.code === 11000) return res.status(409).json({ error: 'Username already taken' });
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---- Login ----
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    
    // Validate types explicitly to prevent NoSQL operator injection
    const usernameStr = typeof username === 'string' ? username.trim() : '';
    const passwordStr = typeof password === 'string' ? password.trim() : '';

    // FIX: Require both fields to prevent empty-password logins
    if (!usernameStr || !passwordStr) return res.status(400).json({ error: 'Username and password required' });

    // ✅ Secure: find by username, verify with bcrypt
  // Use $eq with validated string to avoid interpreting objects/operators from user input
  const user = await User.findOne({ username: { $eq: usernameStr } }).exec();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // FIX: Always verify provided password using bcrypt
  const isMatch = await bcrypt.compare(passwordStr, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    const token = genToken();
    sessions.set(token, user._id.toString());
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---- Items ----
app.get('/api/items', auth, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.userId }).sort({ createdAt: 1 }).exec();
    res.json({ items: items.map((i) => i.toJSON()) });
  } catch (err) {
    console.error('List items error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.post('/api/items', auth, async (req, res) => {
  try {
    const { text } = req.body || {};
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
    console.log('[POST /api/items] userId=', req.userId, 'text="' + text + '"');
    const created = await Item.create({ userId: req.userId, text: text.trim() });
    console.log('[POST /api/items] created item id=', created._id.toString());
    res.status(201).json({ item: created.toJSON() });
  } catch (err) {
    console.error('Create item error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/items/:id', auth, async (req, res) => {
  try {
    const rawId = req.params.id;
    // Validate id is a valid ObjectId string and sanitize userId
    if (typeof rawId !== 'string' || !mongoose.Types.ObjectId.isValid(rawId)) {
      return res.status(400).json({ error: 'Invalid item id' });
    }
    const itemId = new mongoose.Types.ObjectId(rawId);
    const userIdStr = typeof req.userId === 'string' ? req.userId : String(req.userId || '');
    if (!mongoose.Types.ObjectId.isValid(userIdStr)) {
      return res.status(400).json({ error: 'Invalid user context' });
    }
    const userId = new mongoose.Types.ObjectId(userIdStr);

    await Item.deleteOne({ _id: itemId, userId: { $eq: userId } }).exec();
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete item error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ---- Startup + Seeding (Top-level await) ----
let mem;
try {
  let mongoUri = process.env.MONGODB_URI;
  if (!mongoUri && (process.env.CI === 'true' || process.env.USE_IN_MEMORY_DB === 'true')) {
    mem = await MongoMemoryServer.create();
    mongoUri = mem.getUri();
    console.log('Started in-memory MongoDB');
  }
  mongoUri = mongoUri || 'mongodb://127.0.0.1:27017/qa_eval';
  await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB || undefined });
  console.log('Connected to MongoDB');

  // ✅ Secure: seed with hashed password
  const username = process.env.SEED_USERNAME || 'test';
  const password = process.env.SEED_PASSWORD || 'password';
  const name = process.env.SEED_NAME || 'Test User';
  const existing = await User.findOne({ username }).exec();
  if (existing) {
    const looksHashed =
      typeof existing.password === 'string' && existing.password.startsWith('$2');
    if (!looksHashed) {
      const hashed = await bcrypt.hash(password, 12);
      existing.password = hashed;
      await existing.save();
      console.log('Upgraded default user password to bcrypt hash');
    }
  } else {
    const hashed = await bcrypt.hash(password, 12);
    await User.create({ username, password: hashed, name });
    console.log('Seeded default user (hashed password):', username);
  }

  const server = app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    try {
      await mongoose.disconnect();
      if (mem) await mem.stop(); // stop in-memory DB if used
      await new Promise((resolve) => server.close(resolve));
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (err) {
  console.error('Failed to start server', err);
  process.exit(1);
}
