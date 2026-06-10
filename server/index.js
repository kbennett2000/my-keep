'use strict';

/**
 * MyKeep server entry point. Binds the configured app (server/app.js) to a port.
 */

const app = require('./app');

const PORT = Number(process.env.PORT) || 8065;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`MyKeep listening on http://0.0.0.0:${PORT}`);
});
