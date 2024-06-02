// bot/models/linksModel.js
const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  category: { type: String, required: true },
  text: { type: String, required: true },
  url: { type: String, required: true }
}, { timestamps: true });

const Link = mongoose.model('Link', linkSchema, 'links');

module.exports = Link;
