'use strict';

/**
 * Password hashing helpers. The only place in the codebase that talks to bcrypt,
 * so the cost factor and algorithm live in one spot.
 *
 * Uses bcryptjs (pure JS) rather than the native `bcrypt`: no node-pre-gyp
 * binary fetch at install time (keeps setup offline-friendly) and no native
 * build in the Docker image.
 */

const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
