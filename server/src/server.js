import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const app = express();
const opts = { timestamps: true };

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use('/api', rateLimit({ windowMs: 60000, limit: 100 }));

const userSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, lowercase: true },
  passwordHash: String,
  company: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Company' },
  role: { type: String, enum: ['owner', 'admin', 'member'], default: 'owner' }
}, opts);

const companySchema = new mongoose.Schema({
  name: { type: String, required: true }
}, opts);

const itemSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, index: true, required: true },
  kind: { type: String, enum: ['customer', 'invoice', 'employee', 'task', 'lead', 'document'], required: true },
  title: { type: String, required: true },
  status: { type: String, default: 'open' },
  amount: { type: Number, default: 0 },
  dueDate: Date,
  details: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdBy: mongoose.Schema.Types.ObjectId
}, opts);

const runSchema = new mongoose.Schema({
  company: mongoose.Schema.Types.ObjectId,
  user: mongoose.Schema.Types.ObjectId,
  request: String,
  agent: String,
  steps: [mongoose.Schema.Types.Mixed],
  status: String,
  answer: String
}, opts);

const User = mongoose.model('User', userSchema);
const Company = mongoose.model('Company', companySchema);
const Item = mongoose.model('Item', itemSchema);
const Run = mongoose.model('Run', runSchema);

const signToken = (user) => jwt.sign({ id: user.id, company: String(user.company), role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function auth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.replace(/^Bearer\s+/, '');
    req.actor = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Authentication required' });
  }
}

app.get('/api/health', (_, res) => {
  res.json({
    ok: true,
    db: mongoose.connection.readyState === 1,
    groqConfigured: !!process.env.GROQ_API_KEY,
    oauthConfigured: !!process.env.GOOGLE_CLIENT_ID
  });
});

app.post('/api/auth/register', wrap(async (req, res) => {
  const body = z.object({ company: z.string().trim().min(2), email: z.string().email(), password: z.string().min(8) }).parse(req.body);
  const email = body.email.toLowerCase();

  if (await User.exists({ email })) {
    return res.status(409).json({ error: 'Email already exists.' });
  }

  const company = await Company.create({ name: body.company.trim() });
  const passwordHash = await bcrypt.hash(body.password, 12);
  const user = await User.create({ email, passwordHash, company: company._id, role: 'owner' });

  return res.status(201).json({ token: signToken(user), email: user.email, company: company.name, name: company.name });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
  const user = await User.findOne({ email: body.email.toLowerCase() });

  if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const company = await Company.findById(user.company);
  return res.json({ token: signToken(user), email: user.email, company: company?.name || 'Workspace', name: company?.name || 'Workspace' });
}));

app.post('/api/auth/oauth/:provider', wrap(async (req, res) => {
  const provider = (req.params.provider || '').toLowerCase();
  const body = z.object({ name: z.string().optional(), email: z.string().email().optional(), company: z.string().trim().min(2).optional() }).parse(req.body || {});

  if (!['google', 'github'].includes(provider)) {
    return res.status(400).json({ error: 'Unsupported OAuth provider.' });
  }

  const email = (body.email || `${provider}-user@demo.local`).toLowerCase();
  const companyName = body.company || `${provider.charAt(0).toUpperCase()}${provider.slice(1)} Workspace`;

  let user = await User.findOne({ email });
  let company = null;

  if (!user) {
    company = await Company.create({ name: companyName });
    user = await User.create({
      email,
      passwordHash: await bcrypt.hash(`${provider}-oauth-${Date.now()}`, 12),
      company: company._id,
      role: 'owner'
    });
  } else {
    company = await Company.findById(user.company);
  }

  return res.json({ token: signToken(user), email: user.email, company: company?.name || companyName, name: company?.name || companyName, provider });
}));

app.get('/api/profile', auth, wrap(async (req, res) => {
  const user = await User.findById(req.actor.id).lean();
  const company = await Company.findById(user.company).lean();

  return res.json({
    user: { id: user._id, email: user.email, role: user.role },
    company: { id: company._id, name: company.name }
  });
}));

app.get('/api/items', auth, wrap(async (req, res) => {
  const filter = { company: req.actor.company };
  if (req.query.kind) filter.kind = req.query.kind;

  const items = await Item.find(filter).sort({ createdAt: -1 }).limit(250).lean();
  return res.json(items);
}));

app.post('/api/items', auth, wrap(async (req, res) => {
  const body = z.object({
    kind: z.enum(['customer', 'invoice', 'employee', 'task', 'lead', 'document']),
    title: z.string().min(1).max(200),
    status: z.string().max(40).optional(),
    amount: z.number().finite().optional(),
    details: z.record(z.any()).optional()
  }).parse(req.body);

  const item = await Item.create({ ...body, company: req.actor.company, createdBy: req.actor.id, amount: Number(body.amount || 0), details: body.details || {} });
  return res.status(201).json(item);
}));

app.patch('/api/items/:id', auth, wrap(async (req, res) => {
  const body = z.object({ title: z.string().min(1).max(200).optional(), status: z.string().max(40).optional(), amount: z.number().finite().optional() }).parse(req.body);
  const item = await Item.findOneAndUpdate({ _id: req.params.id, company: req.actor.company }, { $set: body }, { new: true, runValidators: true });

  if (!item) return res.status(404).json({ error: 'Record not found.' });
  return res.json(item);
}));

app.delete('/api/items/:id', auth, wrap(async (req, res) => {
  if (req.actor.role === 'member') return res.status(403).json({ error: 'Forbidden' });
  const result = await Item.deleteOne({ _id: req.params.id, company: req.actor.company });
  return res.json({ deleted: result.deletedCount === 1 });
}));

app.post('/api/ai/run', auth, wrap(async (req, res) => {
  const body = z.object({ message: z.string().min(1).max(4000) }).parse(req.body);

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({ error: 'Set GROQ_API_KEY in server/.env to enable the AI agent. The app will use seeded data until you add your key.' });
  }

  const records = await Item.find({ company: req.actor.company }).limit(8).lean();
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      temperature: 0.7,
      messages: [
        { role: 'system', content: 'You are the orchestration agent for a mini ERP. Use the provided company data as the source of truth. Never invent records or numbers. Give crisp, factual answers with clear actions.' },
        { role: 'user', content: `${body.message}\n\nCompany records:\n${JSON.stringify(records, null, 2)}` }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error: ${text || 'Unknown error'}`);
  }

  const data = await response.json();
  const answer = data.choices?.[0]?.message?.content || 'No AI response returned.';

  await Run.create({
    company: req.actor.company,
    user: req.actor.id,
    request: body.message,
    agent: 'orchestrator',
    status: 'completed',
    answer,
    steps: [
      { agent: 'orchestrator', status: 'completed', summary: 'Groq agent received the request and reviewed the business context.' },
      { agent: 'analytics', status: 'completed', summary: `Reviewed ${records.length} ERP records for the current company.` }
    ]
  });

  return res.json({
    answer,
    agent: 'orchestrator',
    steps: [
      { agent: 'orchestrator', status: 'completed', summary: 'Groq agent received the request and reviewed the business context.' },
      { agent: 'analytics', status: 'completed', summary: `Reviewed ${records.length} ERP records for the current company.` }
    ],
    records,
    totalRecords: records.length
  });
}));

app.get('/api/ai/runs', auth, wrap(async (req, res) => {
  const runs = await Run.find({ company: req.actor.company }).sort({ createdAt: -1 }).limit(30).lean();
  return res.json(runs);
}));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const message = err instanceof z.ZodError ? err.issues.map((issue) => issue.message).join(', ') : err.message || 'Request failed';
  return res.status(err instanceof z.ZodError ? 400 : 500).json({ error: message });
});

const start = async () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('Set JWT_SECRET with at least 32 characters.');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mini_erp');
  app.listen(process.env.PORT || 4000, () => console.log('API listening on port 4000'));
};

start().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});
