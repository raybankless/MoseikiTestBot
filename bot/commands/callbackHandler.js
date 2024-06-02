// bot/commands/callbackHandler.js
const { setUserState, getUserState, clearUserState } = require('../state');
const logger = require('../../utils/logger');
const { appVersions } = require('../../config');
const { getAppVersionKeyboard, getOperatingSystemKeyboard } = require('../../utils/inlineKeyboards');
const { operatingSystems } = require('../../config');

async function handleCallbackQuery(bot, query) {
  const userId = query.from.id;
  const state = await getUserState(userId) || {};

  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  logger.info(`Received callback query: ${data}`);
  logger.info(`Current state for user ${userId}: ${JSON.stringify(state.step)}`);

  try {
    if (data.startsWith('os_')) {
      state.deviceOs = data.replace('os_', '');
      state.step = 'bug_add_device_os_version';
      logger.info(`OS selected: ${state.deviceOs}, state updated to bug_add_device_os_version for user: ${userId}`);
      await setUserState(userId, state);
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
      bot.sendMessage(chatId, 'Please enter the OS version of the device (e.g. 14.4, 11).').then(() => {
        logger.info('OS version prompt sent to user');
      }).catch(error => {
        logger.error(`Failed to send OS version prompt: ${error.message}`);
      });
    } else if (data.startsWith('device_')) {
      state.device = data.replace('device_', '');
      state.step = 'bug_appVersion';
      logger.info(`Device selected: ${state.device}, state updated to bug_appVersion for user: ${userId}`);
      await setUserState(userId, state);
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
      const appVersionKeyboard = getAppVersionKeyboard(appVersions);
      bot.sendMessage(chatId, 'Please select the Moseiki app version:', appVersionKeyboard);
    } else if (data === 'add_device') {
      state.step = 'bug_add_device_name';
      logger.info(`Add device selected, state updated to bug_add_device_name for user: ${userId}`);
      await setUserState(userId, state);
      await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
      bot.sendMessage(chatId, 'Please enter the device name (e.g. iPhone 14).').then(() => {
        logger.info('Device name prompt sent to user');
      }).catch(error => {
        logger.error(`Failed to send device name prompt: ${error.message}`);
      });
    }else if (data === 'new_version') {
        state.step = 'bug_add_appVersion';
        logger.info(`New version selected, state updated to bug_add_appVersion for user: ${userId}`);
        await setUserState(userId, state);
        await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: messageId });
        await bot.sendMessage(chatId, 'Please enter the new app version:');
    }else if (data === 'bug_continue_no_upload') {
      state.step = 'bug_continue_no_upload';

      await handleBugSteps(bot, { chat: { id: chatId }, from: { id: userId } });
    } else if (data === 'bug_upload_more_yes') {
      state.step = 'bug_upload_more_yes';
      await setUserState(userId, state);
      await handleBugSteps(bot, { chat: { id: chatId }, from: { id: userId } });
    }
  } catch (error) {
    logger.error("Error handling callback query:", error);
    await bot.sendMessage(chatId, "Something went wrong. Please try again.", {
      reply_markup: { remove_keyboard: true }
    });
    await clearUserState(userId);
  }
}

module.exports = {
  handleCallbackQuery
};
