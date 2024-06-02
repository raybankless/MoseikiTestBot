// server/index.js
const express = require('express');
const { port } = require('../config');
const logger = require('../utils/logger');

const app = express();

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Status</title>
    </head>
    <body>
      <h1>Application Started</h1>
      <p>Server is running on port ${port}</p>
    </body>
    </html>
  `);
  logger.info('Root endpoint accessed.');
});

// Handle 404
app.use((req, res) => {
  logger.warn('404: Page not found');
  res.status(404).send('404: Page not found');
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(`500: Internal Server Error - ${err.stack}`);
  res.status(500).send('500: Internal Server Error');
});

const server = app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use. Trying another port...`);
    const dynamicPort = 0;  // 0 means assign a random available port
    app.listen(dynamicPort, function () {
      const newPort = this.address().port;
      logger.info(`Server is running on port ${newPort}`);
    });
  } else {
    logger.error(`Server error: ${err.message}`);
  }
});

module.exports = app;
