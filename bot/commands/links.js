// bot/commands/links.js
const Link = require('../../data/models/linksModel');

async function handleLinksCommand(bot, msg) {
  const chatId = msg.chat.id;

  const links = await Link.find({});
  const allLinks = links.map(link => ({ text: link.text, url: link.url }));

  // Group the links into pairs
  const buttons = [];
  for (let i = 0; i < allLinks.length; i += 2) {
    const row = [];
    row.push({ text: allLinks[i].text, url: allLinks[i].url });
    if (allLinks[i + 1]) {
      row.push({ text: allLinks[i + 1].text, url: allLinks[i + 1].url });
    }
    buttons.push(row);
  }

  const options = {
    reply_markup: {
      inline_keyboard: buttons
    }
  };

  bot.sendMessage(chatId, "Here are some useful links:", options);
}

module.exports = handleLinksCommand;
