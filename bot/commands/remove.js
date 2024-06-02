// bot/commands/remove.js

const { clearUserState } = require('../state');
const logger = require('../../utils/logger');

async function handleRemoveCommand(bot, msg) {
  const userId = msg.from.id;
  const chatId = msg.chat.id;

  try {
   // await clearUserState(userId);
    await bot.sendMessage(chatId, "Keyboard removed and state cleared.", {
      reply_markup: { remove_keyboard: true }
    });
    logger.info(`Removed keyboard and cleared state for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to remove keyboard for user ${userId}: ${error.message}`);
    await bot.sendMessage(chatId, "Failed to remove keyboard. Please try again.");
  }
}

module.exports = handleRemoveCommand;
