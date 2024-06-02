// bot/handlers.js
const TelegramBot = require('node-telegram-bot-api');
const logger = require('../utils/logger');
const { telegramToken } = require('../config');
const { fetchJiraBoards, fetchJiraContributors, fetchChannelMappings, fetchLinks, getUserById } = require('../data/fetchData');
const { handleTaskCommand, handleTaskSteps, handleTaskCallbackQuery } = require('../bot/commands/task');
const handleLinksCommand = require('../bot/commands/links');
const { handleBugCommand, handleBugSteps } = require('./commands/bug');
const { handleCallbackQuery } = require('./commands/callbackHandler');
const handleStopCommand = require('./commands/stop');
const { clearAllUserStates, clearUserState, getUserState } = require('./state');
const handleRemoveCommand = require('./commands/remove');

const bot = new TelegramBot(telegramToken, { polling: true });

async function initialize() {
  try {
    await clearAllUserStates();
    await fetchJiraBoards();
    await fetchJiraContributors();
    //global.channelMappings = await fetchChannelMappings();
    await fetchLinks();
  } catch (error) {
    logger.error(`Initialization error: ${error.message}`);
  }
}

initialize();
bot.onText(/\/remove/, async (msg) => handleRemoveCommand(bot, msg));
bot.onText(/\/links/, (msg) => handleLinksCommand(bot, msg));
bot.onText(/\/bug/, async (msg) => {
  const userId = msg.from.id;
  await clearUserState(userId);
  logger.info('Received /bug command');
  handleBugCommand(bot, msg);
});

bot.onText(/\/task/, async (msg) => {
  const userId = msg.from.id;
  await clearUserState(userId);
  logger.info('Received /task command');
  handleTaskCommand(bot, msg);
});

bot.onText(/\/stop/, async (msg) => handleStopCommand(bot, msg));

bot.on('message', async (msg) => {
  logger.info(`Received message: ${msg.text}`);
  const userId = msg.from.id;
  const state = await getUserState(userId);

  if (state && state.step) {
    logger.info(`Handler - Current state for user ${userId}: ${JSON.stringify(state.step)}`);
    if (state.step.startsWith('bug_')) {
      await handleBugSteps(bot, msg);
    } else if (state.step.startsWith('task_')) {
      await handleTaskSteps(bot, msg);
    }
  }
});



bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const state = await getUserState(userId);

  if (state && state.step) {
    logger.info(`Handler - Current state for user ${userId}: ${JSON.stringify(state.step)}`);
    if (state.step.startsWith('bug_')) {
      await handleBugSteps(bot, query);
    } else if (state.step.startsWith('task_')) {
      await handleTaskCallbackQuery(bot, query);
    }
  }
});


bot.on('polling_error', (error) => {
  logger.error(`Polling error: ${error.message}`);
});

module.exports = bot;
