// bot/models/stateModel.js
const mongoose = require('mongoose');

const userStateSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  state: { type: Object, required: true },
}, { timestamps: true });

const UserState = mongoose.model('UserState', userStateSchema, 'userstates'); // Explicitly set the collection name

module.exports = UserState;
