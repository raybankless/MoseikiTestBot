// bot/models/deviceModel.js
const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  brandModel: { type: String, required: true },
  os: { type: String, required: true },
  osVersion: { type: String, required: true }
}, { timestamps: true });

const Device = mongoose.model('Device', deviceSchema, 'devices'); // Explicitly set the collection name

module.exports = Device;

