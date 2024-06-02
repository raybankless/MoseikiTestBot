// data/models/jiraBoardModel.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JiraBoardSchema = new Schema({
  boardId: { type: Number, required: true },
  projectKey: { type: String, required: true },
  name: { type: String, required: true },
  epics: [
    {
      epicId: { type: Number, required: true },
      key: { type: String, required: true },
      name: { type: String, required: true }
    }
  ]
});

module.exports = mongoose.model('JiraBoard', JiraBoardSchema);
