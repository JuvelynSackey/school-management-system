const express = require('express');
const path = require('path');
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

app.use(notFound);
app.use(errorHandler);

module.exports = app;
