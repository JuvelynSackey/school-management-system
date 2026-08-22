const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config');
const routes = require('./routes');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Uploaded assets (school logos, etc.) — served with an explicit
// cross-origin allowance since helmet's default Cross-Origin-Resource-Policy
// would otherwise block the client (a different origin in dev) from loading
// these as <img> sources.
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
}));

app.use('/api', routes);

// Single-service deploy: Express serves the built React client directly,
// so the app and API share one URL and one origin (no CORS needed between
// them). A no-op in local dev, where client/dist doesn't exist — Vite's
// own dev server serves the client there instead, on its own port.
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  // Anything not already matched by /api or /uploads above is a client-side
  // route (React Router) — hand back index.html and let the SPA resolve it.
  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
