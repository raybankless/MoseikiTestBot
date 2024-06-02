const { setUserState, getUserState, clearUserState } = require("../state");
const logger = require("../../utils/logger");
const axios = require("axios");
const path = require("path");
const { downloadFile, uploadFileToJira } = require("../../utils/file");
const {
  jiraUrl,
  jiraEmail,
  jiraApiToken,
  telegramToken,
} = require("../../config");
const JiraBoard = require("../../data/models/jiraBoardModel");
const JiraContributor = require("../../data/models/jiraContributorModel");
const {
  getBoardKeyboard,
  getEpicKeyboard,
  getContinueKeyboard,
  getUploadMoreKeyboard,
  getAssigneeKeyboard
} = require("../../utils/inlineKeyboards");
const { getUserById } = require("../../data/fetchData");

async function handleTaskCommand(bot, msg) {
  const userId = msg.from.id;
  const username = msg.from.username || msg.from.first_name;
  const channelName = msg.chat.title || "DirectMessage";
  const state = (await getUserState(userId)) || {};

  if (state.step) {
    bot.sendMessage(
      userId,
      `You are already in the middle of another process. Please complete it or use /stop to start over.`,
    );
    return;
  }

  state.step = "task_selectBoard";
  state.username = username;
  state.channelName = channelName;
  state.originalChatId = msg.chat.id;
  await setUserState(userId, state);

  try {
    const boards = await JiraBoard.find({});
    if (boards.length === 0) {
      bot.sendMessage(userId, "No boards found.");
      logger.warn("No Jira boards found in the database.");
      return;
    }
    console.log('Boards fetched:', boards); // Debugging log
    const boardKeyboard = getBoardKeyboard(boards);
    bot.sendMessage(
      userId,
      "Please select the board to create the issue:",
      boardKeyboard,
    );
    logger.info(
      `Boards fetched successfully: ${boards.map((board) => board.name).join(", ")}`,
    );
  } catch (error) {
    logger.error(`Failed to fetch Jira boards: ${error.message}`);
    bot.sendMessage(
      userId,
      "Failed to fetch Jira boards. Please try again later.",
    );
  }
}


async function handleTaskSteps(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const state = (await getUserState(userId)) || {};

  if (!state.step || msg.text === "/stop") {
    await clearUserState(userId);
    bot.sendMessage(
      chatId,
      "Process stopped. You can start again with /bug or /task.",
    );
    return;
  }

  try {
    switch (state.step) {
      case "task_title":
        state.title = msg.text;
        state.step = "task_description";
        await setUserState(userId, state);
        await bot.sendMessage(
          chatId,
          "Please enter the description of the task.",
        );
        break;

      case "task_description":
        state.description = msg.text;
        state.step = "task_selectAssignee";
        await setUserState(userId, state);

        const contributors = await JiraContributor.find({});
        const assigneeKeyboard = getAssigneeKeyboard(contributors);
        await bot.sendMessage(userId, "Please select an assignee:",assigneeKeyboard );
        break;

      case "task_screenshot":
        if (msg.photo || msg.video) {
          const uploadingMessage = await bot.sendMessage(chatId, "Uploading...");
          const uploadingMessageId = uploadingMessage.message_id;
          const file = msg.photo ? msg.photo[msg.photo.length - 1] : msg.video;
          const fileId = file.file_id;
          const fileData = await bot.getFile(fileId);
          const fileUrl = `https://api.telegram.org/file/bot${telegramToken}/${fileData.file_path}`;
          const localFilePath = path.join(
            __dirname,
            "../../temp",
            fileData.file_path.split("/").pop(),
          );

          try {
            await downloadFile(fileUrl, localFilePath);
            logger.info(
              `${msg.photo ? "Screenshot" : "Video"} downloaded to ${localFilePath}`,
            );

            state.uploadedFiles = state.uploadedFiles || [];
            state.uploadedFiles.push(localFilePath);
            await setUserState(userId, state);
            await bot.deleteMessage(chatId, uploadingMessageId);
            await bot.sendMessage(chatId, "Do you want to upload more files?", {
              reply_markup: getUploadMoreKeyboard(),
            });
          } catch (error) {
            logger.error(`Failed to download the file: ${error.message}`);
            await bot.deleteMessage(chatId, uploadingMessageId);
            bot.sendMessage(
              chatId,
              `Failed to download the file: ${error.message}`,
            );
          }
        } else {
          await bot.sendMessage(
            chatId,
            "You can upload attachments if any. One at a time. Only these file types: gif, .jpg, .png, .csv, .xls, .pdf, .bmp, .doc, .txt, .jpeg, .tiff, .xlsx, .docx, .msg, .ppt, .pptx, .vsd, .vsdx.",
            {
              reply_markup: getContinueKeyboard(),
            },
          );
        }
        break;

      case "task_continue_no_upload":
        try {
          const loadingMessage = await bot.sendMessage(chatId, "Creating Task on Jira...");
          const loadingMessageId = loadingMessage.message_id;
          const payload = {
            fields: {
              project: { key: state.projectKey },
              summary: state.title,
              description: {
                type: "doc",
                version: 1,
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: state.description }],
                  },
                ],
              },
              issuetype: { name: "Task" },
              assignee: { id: state.assignee },
              ...(state.epicId !== "epic_none" && {
                parent: { key: state.epicKey },
              }),
            },
          };

          const options = {
            method: "post",
            url: `${jiraUrl}/rest/api/3/issue`,
            headers: {
              Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString("base64")}`,
              "Content-Type": "application/json",
            },
            data: payload,
          };

          logger.info(`Jira issue creation URL: ${options.url}`);
          logger.info(
            `Jira issue creation payload: ${JSON.stringify(payload)}`,
          );

          const response = await axios(options);
          if (response.status === 201) {
            const issueKey = response.data.key;

            if (state.uploadedFiles) {
              for (const filePath of state.uploadedFiles) {
                await uploadFileToJira(issueKey, filePath);
              }
            }
            await bot.deleteMessage(chatId, loadingMessageId);

            bot.sendMessage(
              chatId,
              `Task created successfully! You can view it here ${jiraUrl}/browse/${issueKey}`,
            );
            logger.info("Task created successfully!");
          } else {
            await bot.deleteMessage(chatId, loadingMessageId);

            bot.sendMessage(
              chatId,
              `Failed to create task: ${JSON.stringify(response.data)}`,
            );
            logger.error(
              `Failed to create task: ${JSON.stringify(response.data)}`,
            );
          }

          await clearUserState(userId);
        } catch (error) {
          await bot.deleteMessage(chatId, loadingMessageId);

          const errorMessage = error.response
            ? JSON.stringify(error.response.data)
            : error.message;
          bot.sendMessage(
            chatId,
            `Failed to create Jira issue: ${errorMessage}`,
          );
          logger.error(`Failed to create Jira issue: ${errorMessage}`);
          await clearUserState(userId);
        }
        break;
    }
  } catch (error) {
    logger.error("Error handling message:", error);
    bot.sendMessage(chatId, "Something went wrong. Please try again.");
    await clearUserState(userId);
  }
}

async function handleTaskCallbackQuery(bot, query) {
  const userId = query.from.id;
  const state = (await getUserState(userId)) || {};

  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;

  try {
    logger.info(`Callback query received: ${data}`);
    if (data.startsWith("board_")) {
      const boardId = data.replace("board_", "");
      const board = await JiraBoard.findById(boardId);
      if (board) {
        state.boardId = boardId; // Ensure boardId is set in the state
        state.projectKey = board.projectKey; // Use the actual project key (e.g., "MOP")
        logger.info(`Selected project key: ${state.projectKey}`); // Log the correct project key
        state.step = "task_selectEpic";
        await setUserState(userId, state);
        logger.info(
          `Board found: ${board.name} with projectKey: ${board.projectKey}`,
        ); // Log found board details
        const epicKeyboard = getEpicKeyboard(board.epics);
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: messageId },
        );
        await bot.sendMessage(chatId, "Please select an epic:", epicKeyboard);
      } else {
        logger.error(`Board with ID ${boardId} not found`);
        bot.sendMessage(
          chatId,
          "Board not found. Please select a valid board.",
        );
      }
    } else if (data.startsWith("epic_")) {
      const epicKey = data.replace("epic_", "");
      if (epicKey === "epicless") {
        state.epicId = "epic_none";
        state.epicKey = null;
      } else {
        const board = await JiraBoard.findById(state.boardId);
        if (board) {
          const epic = board.epics.find(
            (epic) => epic.key === epicKey,
          );
          if (epic) {
            state.epicId = epic.epicId;
            state.epicKey = epic.key; // Ensure to use the `key` field
          } else {
            logger.error(`Epic with key ${epicKey} not found in board ${state.boardId}`);
            bot.sendMessage(
              chatId,
              "Epic not found. Please select a valid epic.",
            );
            return;
          }
        } else {
          logger.error(`Board with ID ${state.boardId} not found`);
          bot.sendMessage(
            chatId,
            "Board not found. Please select a valid board.",
          );
          return;
        }
      }
      state.step = "task_title";
      await setUserState(userId, state);
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: messageId },
      );
      bot.sendMessage(chatId, "Please enter the task title.");
    } else if (data.startsWith("assignee_")) {
      const assigneeId = data.replace("assignee_", "");
      const assignee = await getUserById(assigneeId);
      if (assignee) {
        state.assignee = assignee.accountId;
        logger.info(
          `Selected assignee: ${assignee.displayName} with ID: ${state.assignee}`,
        );
        state.step = "task_screenshot";
        await setUserState(userId, state);
        await bot.editMessageReplyMarkup(
          { inline_keyboard: [] },
          { chat_id: chatId, message_id: messageId },
        );
        await bot.sendMessage(
          chatId,
          "You can upload attachments one at a time. Supported file types are:\n\n" +
            "gif, jpg, png, csv, xls, pdf, bmp, doc, txt, jpeg, tiff, xlsx, docx, msg, ppt, pptx, vsd, vsdx.",
          {
            reply_markup: getContinueKeyboard(),
          },
        );
      } else {
        logger.error(`Assignee with ID ${assigneeId} not found`);
        await bot.sendMessage(
          chatId,
          "Assignee not found. Please select a valid assignee.",
        );
      }
    } else if (data === "bug_continue_no_upload") {
      state.step = "task_continue_no_upload";
      await setUserState(userId, state);
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: messageId },
      );
      await handleTaskSteps(bot, {
        chat: { id: chatId },
        from: { id: userId },
      });
    } else if (data === "bug_upload_more_yes") {
      state.step = "task_screenshot";
      await setUserState(userId, state);
      await bot.editMessageReplyMarkup(
        { inline_keyboard: [] },
        { chat_id: chatId, message_id: messageId },
      );
      await bot.sendMessage(
        chatId,
        "You can upload attachments if any. One at a time. Only these file types: gif, .jpg, .png, .csv, .xls, .pdf, .bmp, .doc, .txt, .jpeg, .tiff, .xlsx, .docx, .msg, .ppt, .pptx, .vsd, .vsdx.",
      );
    }
  } catch (error) {
    logger.error("Error handling callback query:", error);
    bot.sendMessage(chatId, "Something went wrong. Please try again.");
    await clearUserState(userId);
  }
}


module.exports = {
  handleTaskCommand,
  handleTaskSteps,
  handleTaskCallbackQuery,
};

