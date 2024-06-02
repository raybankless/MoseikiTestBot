const mongoose = require('mongoose');
const { fetchJiraBoards, fetchJiraContributors, fetchLinks } = require('./fetchData'); // Removed fetchChannelMappings
const logger = require('../utils/logger');

mongoose.connect('your-mongodb-connection-string', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000 // Increase timeout to 30 seconds
}).then(() => {
  console.log('MongoDB connected successfully');
  updateDatabase();
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('error', err => {
  console.error(`MongoDB connection error: ${err.message}`);
});

async function updateDatabase() {
  try {
    await fetchJiraBoards();
    await fetchJiraContributors();
    await fetchLinks();
    logger.info("Database updated successfully.");
  } catch (error) {
    logger.error(`Database update error: ${error.message}`);
  } finally {
    mongoose.connection.close();
  }
}
