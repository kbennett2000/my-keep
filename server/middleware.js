'use strict';

/**
 * Shared route middleware.
 *
 * `requireAuth` is the single guard every user-scoped API route depends on: it
 * rejects any request without an established session before the handler runs, so
 * handlers can trust `req.session.userId`.
 */

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

module.exports = { requireAuth };
