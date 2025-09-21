import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from './models/User.js';
import { Item } from './models/Item.js';
import { RuntimePeriod } from './models/RuntimePeriod.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
// Track when this server process started
const SERVER_START_TIME = new Date();

// Enforce strict query parsing to avoid interpreting unexpected operators from user input
mongoose.set('strictQuery', true);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
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

// Utility: format seconds into a simple human string
function formatDuration(totalSeconds) {
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor((totalSeconds / 3600) % 24);
  const d = Math.floor(totalSeconds / 86400);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(' ');
} 

// Report total operational time for this process instance
app.get('/uptime', (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  res.json({
    startTime: SERVER_START_TIME.toISOString(),
    uptimeSeconds,
    uptimeHuman: formatDuration(uptimeSeconds),
  });
});

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
    if (!text || !text.trim()) return res.status(400).json({ error: 'Text required' });
    const created = await Item.create({ userId: req.userId, text: text.trim() });
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

// ---- Startup + Seeding ----
async function start() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    let mem;
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
    if (!existing) {
      const hashed = await bcrypt.hash(password, 12);
      await User.create({ username, password: hashed, name });
      console.log('Seeded default user (hashed password):', username);
    } else {
      const looksHashed =
        typeof existing.password === 'string' && existing.password.startsWith('$2');
      if (!looksHashed) {
        const hashed = await bcrypt.hash(password, 12);
        existing.password = hashed;
        await existing.save();
        console.log('Upgraded default user password to bcrypt hash');
      }
    }

    // Close any previously open runtime periods (e.g., from crashed or failed starts)
    await RuntimePeriod.updateMany({ endTime: null }, { endTime: new Date() });

    // Declare here so shutdown can reference it
    let currentPeriod = null;

    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
      // Create a runtime period only after successful bind to avoid duplicates on EADDRINUSE
      RuntimePeriod.create({ startTime: new Date() })
        .then((p) => { currentPeriod = p; })
        .catch((err) => console.error('Failed to create runtime period', err));
    });

    const shutdown = async () => {
      try {
        // Close the runtime period with an endTime if it's still open
        if (currentPeriod && !currentPeriod.endTime) {
          currentPeriod.endTime = new Date();
          try { await currentPeriod.save(); } catch (_) {}
        }
        await mongoose.disconnect();
        if (mem) await mem.stop();
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
}

start();

// Endpoint to compute total operational time across restarts in a given window
// Query params: from, to (ISO strings). If omitted, covers all recorded time until now.
app.get('/operational-time', async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : new Date();
    if ((from && isNaN(from)) || (to && isNaN(to))) {
      return res.status(400).json({ error: 'Invalid from/to query params' });
    }

    // Fetch all periods overlapping the window
    // Overlap condition: startTime <= to AND (endTime is null OR endTime >= from)
    const match = {};
    const andConds = [];
    if (to) andConds.push({ startTime: { $lte: to } });
    if (from) andConds.push({ $or: [{ endTime: null }, { endTime: { $gte: from } }] });
    if (andConds.length) Object.assign(match, { $and: andConds });

    // If no bounds specified, fetch all
    const periods = await RuntimePeriod.find(Object.keys(match).length ? match : {}).exec();
    const windowStart = from || new Date(0);
    const windowEnd = to || new Date();

    let totalMs = 0;
    for (const p of periods) {
      const s = new Date(p.startTime);
      const e = new Date(p.endTime || new Date());
      const overlapStart = s > windowStart ? s : windowStart;
      const overlapEnd = e < windowEnd ? e : windowEnd;
      const ms = Math.max(0, overlapEnd - overlapStart);
      totalMs += ms;
    }

    const totalSeconds = Math.floor(totalMs / 1000);
    return res.json({
      from: windowStart.toISOString(),
      to: windowEnd.toISOString(),
      totalSeconds,
      totalHuman: formatDuration(totalSeconds),
      periods: periods.map(p => ({ startTime: p.startTime, endTime: p.endTime || null })),
    });
  } catch (err) {
    console.error('Operational time error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});
