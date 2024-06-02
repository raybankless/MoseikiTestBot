// bot/models/channelMappingModel.js
const mongoose = require('mongoose');

const channelMappingSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  channelName: { type: String, required: true }
}, { timestamps: true });

const ChannelMapping = mongoose.model('ChannelMapping', channelMappingSchema, 'channelMappings');

module.exports = ChannelMapping;
