import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from './models/User.js';
import { Item } from './models/Item.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// In-memory session tokens (keep simple for now; tokens map to Mongo user _id)
let sessions = new Map(); // token -> userId(ObjectId string)

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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const user = await User.findOne({ username, password }).exec();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = genToken();
    sessions.set(token, user._id.toString());
    res.json({ token, user: user.toJSON() });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.get('/api/items', auth, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.userId }).sort({ createdAt: 1 }).exec();
    res.json({ items: items.map(i => i.toJSON()) });
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
    await Item.deleteOne({ _id: req.params.id, userId: req.userId }).exec();
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete item error', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

async function start() {
  try {
    let mongoUri = process.env.MONGODB_URI;
    let mem;
    if (!mongoUri && (process.env.CI === 'true' || process.env.USE_IN_MEMORY_DB === 'true')) {
      // Spin up in-memory MongoDB for CI or when explicitly requested
      mem = await MongoMemoryServer.create();
      mongoUri = mem.getUri();
      console.log('Started in-memory MongoDB');
    }
    mongoUri = mongoUri || 'mongodb://127.0.0.1:27017/qa_eval';
    await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB || undefined });
    console.log('Connected to MongoDB');

    // Seed default user if not present
    const username = process.env.SEED_USERNAME || 'test';
    const password = process.env.SEED_PASSWORD || 'password';
    const name = process.env.SEED_NAME || 'Test User';
    const existing = await User.findOne({ username }).exec();
    if (!existing) {
      await User.create({ username, password, name });
      console.log('Seeded default user:', username);
    }

    const server = app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });

    // Graceful shutdown for in-memory server
    const shutdown = async () => {
      try {
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
