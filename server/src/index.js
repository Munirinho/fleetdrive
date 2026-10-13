'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');
const models = require('./models');
const { crudRouter } = require('./crud');
const { buildReport } = require('./report');

const PORT = Number(process.env.PORT) || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/fleetdrive';
const API_KEY = process.env.API_KEY || '';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
// Strip NoSQL-injection keys ($..., dots) from body/query/params.
app.use(mongoSanitize());
// Basic abuse protection: 300 requests / 15 min per IP.
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

// API-key gate: every /api route except /api/health needs header x-api-key.
// If API_KEY is unset (local dev), the API stays open but logs a loud warning.
function requireKey(req, res, next) {
  if (!API_KEY) return next();
  const got = req.get('x-api-key');
  if (got && got === API_KEY) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

app.get('/api/health', (req, res) => res.json({ ok: true, secured: API_KEY !== '' }));
app.use('/api', requireKey);

app.use('/api/drivers', crudRouter(models.Driver, { sort: { name: 1 } }));
app.use('/api/vehicles', crudRouter(models.Vehicle, { sort: { reg: 1 } }));
app.use('/api/signins', crudRouter(models.Signin));
app.use('/api/trips', crudRouter(models.Trip));
app.use('/api/timelogs', crudRouter(models.Timelog));
app.use('/api/fuels', crudRouter(models.Fuel));
app.use('/api/maintenance', crudRouter(models.Maintenance));
app.use('/api/incidents', crudRouter(models.Incident));

app.get('/api/report', async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const [signins, trips, fuels, maintenance, incidents, vehicles] = await Promise.all([
      models.Signin.find({ date }).lean().exec(),
      models.Trip.find({ date }).lean().exec(),
      models.Fuel.find({ date }).lean().exec(),
      models.Maintenance.find({ date }).lean().exec(),
      models.Incident.find({ date }).lean().exec(),
      models.Vehicle.find({}).lean().exec()
    ]);
    res.json(buildReport({ signins, trips, fuels, maintenance, incidents, vehicles }, date));
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
});

async function main() {
  if (!API_KEY) console.warn('WARNING: API_KEY is not set — the API is OPEN. Set API_KEY in .env for production.');
  await mongoose.connect(MONGODB_URI);
  app.listen(PORT, () => console.log(`FleetDrive API listening on http://localhost:${PORT}`));
}

if (require.main === module) {
  main().catch((e) => { console.error(e); process.exit(1); });
}

module.exports = app;
