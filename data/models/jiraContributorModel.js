// bot/models/jiraContributorModel.js
const mongoose = require('mongoose');

const jiraContributorSchema = new mongoose.Schema({
  accountId: { type: String, required: true },
  displayName: { type: String, required: true }
}, { timestamps: true });

const JiraContributor = mongoose.model('JiraContributor', jiraContributorSchema, 'jiraContributors');

module.exports = JiraContributor;
