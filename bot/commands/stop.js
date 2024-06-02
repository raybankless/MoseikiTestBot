// bot/commands/stop.js
const { clearUserState } = require('../state');

async function handleStopCommand(bot, msg) {
  const userId = msg.from.id;
  await clearUserState(userId);
  bot.sendMessage(userId, "Process stopped. You can start again with /bug or /task.");
}

module.exports = handleStopCommand;
