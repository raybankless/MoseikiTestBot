// bot/commands/bug.js
const { setUserState, getUserState, clearUserState } = require("../state");
const logger = require("../../utils/logger");
const { downloadFile, uploadFileToJira } = require("../../utils/file");

const {
  appVersions,
  telegramToken,
  projectKey,
  jiraUrl,
  jiraEmail,
  jiraApiToken,
  operatingSystems,
  bugAssignees,
} = require("../../config");
const path = require("path");
const axios = require("axios");
const ChannelMapping = require("../../data/models/channelMappingModel");
const JiraContributor = require("../../data/models/jiraContributorModel");
const { getSavedDevices } = require("../../data/fetchData");
const Device = require("../../data/models/deviceModel");
const {
  getOperatingSystemKeyboard,
  getAppVersionKeyboard,
  getContinueKeyboard,
  getUploadMoreKeyboard,
} = require("../../utils/inlineKeyboards");
const fs = require("fs");

async function handleBugCommand(bot, msg) {
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  const channelName = msg.chat.title || msg.chat.username || "DirectMessage";
  const state = (await getUserState(userId)) || {};

  if (state.step) {
    if (chatId !== userId) {
      return;
    }
    bot.sendMessage(
      userId,
      `You are already in the middle of another process. Please complete it or use /stop to start over.`,
    );
    return;
  }

  state.step = "bug_description";
  state.username = username;
  state.channelName = channelName;
  state.originalChatId = msg.chat.id;
  await setUserState(userId, state);
  bot.sendMessage(userId, "Please enter the description of the bug.");
  logger.info(
    `User ${userId} started bug command state set to 'bug_description'`,
  );
}

async function handleBugSteps(bot, data) {
  let chatId, userId, state;

  if (data.message) {
    // Handling callback query
    chatId = data.message.chat.id;
    userId = data.from.id;
    state = (await getUserState(userId)) || {};
    console.log(`Received callback query: ${data.data} from user: ${userId}`);
  } else {
    // Handling text message
    chatId = data.chat.id;
    userId = data.from.id;
    state = (await getUserState(userId)) || {};
    console.log(`Received message: ${data.text} from user: ${userId}`);
  }

  if (!state.step || (data.text && data.text === "/stop")) {
    await clearUserState(userId);
    await bot.sendMessage(
      chatId,
      "Bug Report Process stopped. You can start again with /bug or /task.",
      {
        reply_markup: { remove_keyboard: true },
      },
    );
    return;
  }

  if (chatId !== userId) {
    return;
  }

  try {
    switch (state.step) {
      case "bug_description":
        state.description = data.text;
        state.step = "bug_device";
        await setUserState(userId, state);

        const savedDevices = await getSavedDevices(userId);
        const deviceButtons = savedDevices.map((device) => [
          { text: device.brandModel, callback_data: `device_${device._id}` },
        ]);
        deviceButtons.push([
          { text: "+ Add Device", callback_data: "add_device" },
        ]);

        await bot.sendMessage(
          chatId,
          "Please select the device or add a new one:",
          {
            reply_markup: { inline_keyboard: deviceButtons },
          },
        );
        break;

      case "bug_device":
        if (data.data && data.data.startsWith("device_")) {
          state.device = data.data.split("_")[1];
          state.step = "bug_appVersion";
          await setUserState(userId, state);

          const appVersionKeyboard = getAppVersionKeyboard(appVersions);
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: data.message.message_id },
          );
          await bot.sendMessage(
            chatId,
            "Please select the Moseiki app version:",
            { reply_markup: appVersionKeyboard },
          );
        } else if (data.data === "add_device") {
          state.step = "bug_add_device_name";
          await setUserState(userId, state);
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: data.message.message_id },
          );
          await bot.sendMessage(
            chatId,
            "Please enter the device name (e.g. iPhone 14):",
          );
        } else {
          await bot.sendMessage(
            chatId,
            "Invalid selection. Please select an existing device or add a new one.",
          );
        }
        break;

      case "bug_add_device_name":
        state.deviceName = data.text;
        state.step = "bug_add_device_os";
        await setUserState(userId, state);
        const osKeyboard = getOperatingSystemKeyboard(operatingSystems);
        await bot.sendMessage(
          chatId,
          "Please select the OS of the device:",
          osKeyboard,
        );
        break;

      case "bug_add_device_os":
        if (data.data && data.data.startsWith("os_")) {
          state.deviceOs = data.data.split("_")[1];
          state.step = "bug_add_device_os_version";
          await setUserState(userId, state);
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: data.message.message_id },
          );
          await bot.sendMessage(
            chatId,
            "Please enter the OS version of the device (e.g. 14.4, 11):",
          );
        } else {
          await bot.sendMessage(
            chatId,
            "Invalid OS selection. Please select from the inline keyboard.",
          );
        }
        break;

      case "bug_add_device_os_version":
        if (data.text) {
          state.deviceOsVersion = data.text;
          state.step = "bug_appVersion";
          await setUserState(userId, state);

          try {
            const newDevice = new Device({
              userId: userId,
              brandModel: state.deviceName,
              os: state.deviceOs,
              osVersion: state.deviceOsVersion,
            });
            const savedDevice = await newDevice.save();

            state.device = savedDevice._id;
            await setUserState(userId, state);

            const appVersionKeyboard = getAppVersionKeyboard(appVersions);
            await bot.sendMessage(
              chatId,
              "Device added successfully. Please select the Moseiki app version:",
              { reply_markup: appVersionKeyboard },
            );
          } catch (error) {
            await bot.sendMessage(
              chatId,
              `Failed to save device: ${error.message}`,
            );
          }
        } else {
          await bot.sendMessage(
            chatId,
            "Please enter the OS version of the device (e.g. 14.4, 11):",
          );
        }
        break;

      case "bug_appVersion":
        if (data.data && data.data.startsWith("app_")) {
          state.appVersion = data.data.split("_")[1];
          state.step = "bug_screenshot";
          await setUserState(userId, state);
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: data.message.message_id },
          );
          await bot.sendMessage(
            chatId,
            "Please upload the screenshot or video of the bug. You can only upload one asset at a time. Or tap 'No Upload' to finish the process.",
            {
              reply_markup: getContinueKeyboard(),
            },
          );
        } else if (data.data === "new_version") {
          state.step = "bug_add_appVersion";
          await setUserState(userId, state);
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: data.message.message_id },
          );
          await bot.sendMessage(chatId, "Please enter the new app version:");
        } else {
          await bot.sendMessage(
            chatId,
            "Invalid app version selection. Please select from the inline keyboard.",
          );
        }
        break;

      case "bug_add_appVersion":
        if (data.text) {
          const newAppVersion = data.text;
          state.appVersion = newAppVersion;
          state.step = "bug_screenshot";

          // Update the appVersions in config.js
          const config = require("../../config");
          config.appVersions.push(newAppVersion);

          const configPath = path.join(__dirname, "../../config.js");
          const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;

          fs.writeFileSync(configPath, configContent, "utf8");

          await setUserState(userId, state);
          await bot.sendMessage(
            chatId,
            "New app version added. Please upload the screenshot or video of the bug. You can only upload one asset at a time. Or tap 'No Upload' to finish the process.",
            {
              reply_markup: getContinueKeyboard(),
            },
          );
        } else {
          await bot.sendMessage(chatId, "Please enter the new app version:");
        }
        break;

      case "bug_screenshot":
        if (data.data === "bug_continue_no_upload") {
          state.step = "bug_continue_no_upload";
          await setUserState(userId, state);
          await bot.editMessageReplyMarkup(
            { inline_keyboard: [] },
            { chat_id: chatId, message_id: data.message.message_id },
          );
          await handleBugSteps(bot, {
            chat: { id: chatId },
            from: { id: userId },
          });
        } else if (data.photo && data.photo.length > 0) {
          const fileId = data.photo[data.photo.length - 1].file_id;
          const file = await bot.getFile(fileId);
          const fileUrl = `https://api.telegram.org/file/bot${telegramToken}/${file.file_path}`;
          const localFilePath = path.join(
            __dirname,
            "../../temp",
            file.file_path.split("/").pop(),
          );

          try {
            await downloadFile(fileUrl, localFilePath);
            state.uploadedFiles = state.uploadedFiles || [];
            state.uploadedFiles.push(localFilePath);
            await setUserState(userId, state);

            await bot.sendMessage(chatId, "Do you want to upload more files?", {
              reply_markup: getUploadMoreKeyboard(),
            });
          } catch (error) {
            await bot.sendMessage(
              chatId,
              `Failed to download or upload the image: ${error.message}`,
            );
          }
        } else if (data.video && data.video.file_id) {
          const fileId = data.video.file_id;
          const file = await bot.getFile(fileId);
          const fileUrl = `https://api.telegram.org/file/bot${telegramToken}/${file.file_path}`;
          const localFilePath = path.join(
            __dirname,
            "../../temp",
            file.file_path.split("/").pop(),
          );

          try {
            await downloadFile(fileUrl, localFilePath);
            state.uploadedFiles = state.uploadedFiles || [];
            state.uploadedFiles.push(localFilePath);
            await setUserState(userId, state);

            await bot.sendMessage(chatId, "Do you want to upload more files?", {
              reply_markup: getUploadMoreKeyboard(),
            });
          } catch (error) {
            await bot.sendMessage(
              chatId,
              `Failed to download or upload the video: ${error.message}`,
            );
          }
        } else {
          await bot.sendMessage(
            chatId,
            "Please upload a valid screenshot or video, or click 'No Upload' to finish the process.",
            {
              reply_markup: getContinueKeyboard(),
            },
          );
        }
        break;

      case "bug_continue_no_upload":
        try {
          if (!state.issueKey) {
            await createJiraIssue(state, userId);
          }

          if (state.uploadedFiles) {
            for (const filePath of state.uploadedFiles) {
              await uploadFileToJira(state.issueKey, filePath);
            }
          }

          await bot.sendMessage(
            chatId,
            `Bug reported successfully! You can view it [here](${jiraUrl}/browse/${state.issueKey})`,
            { parse_mode: "Markdown" },
          );
          await clearUserState(userId);
        } catch (error) {
          await bot.sendMessage(
            chatId,
            `Failed to upload files: ${error.message}`,
          );
        }
        break;

      case "bug_upload_more_yes":
        state.step = "bug_screenshot";
        await setUserState(userId, state);
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: data.message.message_id },
        );
        await bot.sendMessage(
          chatId,
          "Please upload the screenshot or video of the bug. You can upload only 1 asset at a time.",
        );
        break;
    }
  } catch (error) {
    console.error("Error handling message:", error);
    await bot.sendMessage(chatId, "Something went wrong. Please try again.", {
      reply_markup: { remove_keyboard: true },
    });
    await clearUserState(userId);
  }
}

async function createJiraIssue(state, userId) {
  const device = await Device.findById(state.device);
  const assigneeId = bugAssignees[state.channelName] || null;
  const currentDateTime = new Date();
  const formattedDate = `${currentDateTime.getDate().toString().padStart(2, "0")}.${(currentDateTime.getMonth() + 1).toString().padStart(2, "0")}.${currentDateTime.getFullYear()}`;
  const time = currentDateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const payload = {
    fields: {
      project: { key: projectKey },
      summary: `Bug - ${state.channelName} - ${formattedDate} - ${time}`,
      parent: { key: "MOP-87" },
      description: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: `${state.description}\n\nBug reported by: @${state.username}`,
              },
            ],
          },
        ],
      },
      issuetype: { name: "Bug" },
      reporter: { id: "70121:3903dcf1-aa38-4e77-9f93-ed143ceef68f" },
      customfield_10074: device.osVersion,
      customfield_10081: device.os,
      customfield_10073: device.brandModel,
      customfield_10079: state.appVersion,
    },
  };

  if (assigneeId) {
    payload.fields.assignee = { id: assigneeId };
  }

  try {
    const response = await axios({
      method: "post",
      url: `${jiraUrl}/rest/api/3/issue`,
      headers: {
        Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      data: payload,
    });

    if (response.status === 201) {
      state.issueKey = response.data.key;
      await setUserState(userId, state);
    } else {
      throw new Error(
        `Failed to create Jira issue: ${JSON.stringify(response.data)}`,
      );
    }
  } catch (error) {
    throw new Error(
      `Failed to create Jira issue: ${error.response ? JSON.stringify(error.response.data) : error.message}`,
    );
  }
}

module.exports = {
  handleBugCommand,
  handleBugSteps,
};
