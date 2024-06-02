// bot/state.js
const mongoose = require('mongoose');
const UserState = require('../data/models/stateModel');

mongoose.connect('mongodb+srv://koray:2834@moscluster.urs2wyf.mongodb.net/moseikibot?retryWrites=true&w=majority', {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('error', err => {
  console.error(`MongoDB connection error: ${err.message}`);
});

async function setUserState(userId, newState) {
 // console.log(`Setting state for user ${userId}: ${JSON.stringify(newState)}`);
  await UserState.updateOne(
    { userId },
    { $set: { state: newState } },
    { upsert: true }
  );
 // console.log(`State set for user ${userId}`);
}

async function getUserState(userId) {
  const userState = await UserState.findOne({ userId });
 // console.log(`Retrieved state for user ${userId}: ${JSON.stringify(userState)}`);
  return userState ? userState.state : null;
}

async function clearUserState(userId) {
  console.log(`Clearing state for user ${userId}`);
  await UserState.deleteOne({ userId });
  console.log(`State cleared for user ${userId}`);
}

async function clearAllUserStates() {
  console.log('Clearing all user states');
  await UserState.deleteMany({});
  console.log('All user states cleared');
}

module.exports = {
  setUserState,
  getUserState,
  clearUserState,
  clearAllUserStates,
};
