'use strict';
// Generic CRUD router factory.
const express = require('express');
const mongoose = require('mongoose');

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// options: { model, dateField: true/false, sort }
function crudRouter(model, options) {
  options = options || {};
  const router = express.Router();

  function hasDatePath() {
    return model.schema.path('date') ? true : false;
  }

  // GET / — list, optional ?date=YYYY-MM-DD filter
  router.get('/', async (req, res) => {
    try {
      const filter = {};
      if (req.query.date && hasDatePath()) filter.date = req.query.date;
      let q = model.find(filter);
      if (options.sort) q = q.sort(options.sort);
      else if (hasDatePath()) q = q.sort({ date: -1, _id: -1 });
      else q = q.sort({ _id: -1 });
      const docs = await q.exec();
      res.json(docs);
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
  });

  // GET /:id
  router.get('/:id', async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'invalid id' });
      const doc = await model.findById(req.params.id).exec();
      if (!doc) return res.status(404).json({ error: 'not found' });
      res.json(doc);
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
  });

  // POST /
  router.post('/', async (req, res) => {
    try {
      const doc = await model.create(req.body || {});
      res.status(201).json(doc);
    } catch (e) {
      if (e && e.name === 'ValidationError') return res.status(400).json({ error: e.message });
      if (e && e.code === 11000) return res.status(400).json({ error: 'duplicate key' });
      res.status(500).json({ error: String((e && e.message) || e) });
    }
  });

  // PUT /:id
  router.put('/:id', async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'invalid id' });
      const doc = await model.findByIdAndUpdate(req.params.id, req.body || {}, { new: true, runValidators: true }).exec();
      if (!doc) return res.status(404).json({ error: 'not found' });
      res.json(doc);
    } catch (e) {
      if (e && e.name === 'ValidationError') return res.status(400).json({ error: e.message });
      if (e && e.code === 11000) return res.status(400).json({ error: 'duplicate key' });
      res.status(500).json({ error: String((e && e.message) || e) });
    }
  });

  // DELETE /:id
  router.delete('/:id', async (req, res) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'invalid id' });
      const doc = await model.findByIdAndDelete(req.params.id).exec();
      if (!doc) return res.status(404).json({ error: 'not found' });
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: String((e && e.message) || e) });
    }
  });

  return router;
}

module.exports = { crudRouter };
