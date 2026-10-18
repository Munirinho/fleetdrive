'use strict';
// Vercel entry point. Normalizes any function-path prefix Vercel may introduce
// via routes, then delegates to the Express app. No-op when the URL is already
// the original path.
const app = require('./src/index');

module.exports = (req, res) => {
  const url = req.url || '/';
  req.url = url.replace(/^(?:\/server)?\/app(?=\/|$)/, '') || '/';
  return app(req, res);
};
