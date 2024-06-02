const axios = require('axios');
const JiraBoard = require('../data/models/jiraBoardModel');
const JiraContributor = require('../data/models/jiraContributorModel');
const ChannelMapping = require('../data/models/channelMappingModel');
const { jiraUrl, jiraEmail, jiraApiToken, projectKey } = require('../config');
const Link = require('../data/models/linksModel');
const Device = require('../data/models/deviceModel');
const logger = require("../utils/logger");

async function fetchJiraBoards() {
  const options = {
    method: 'GET',
    url: `${jiraUrl}/rest/agile/1.0/board`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await axios(options);
    logger.info('Boards response:', response.data);

    const boards = response.data.values.map(board => ({
      boardId: board.id,
      name: board.name,
      epics: [],
      projectKey: ''
    }));

    for (const board of boards) {
      const boardDetailsOptions = {
        method: 'GET',
        url: `${jiraUrl}/rest/agile/1.0/board/${board.boardId}`,
        headers: {
          Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      };

      try {
        const boardDetailsResponse = await axios(boardDetailsOptions);
        logger.info(`Board details for ${board.name}:`, boardDetailsResponse.data);
        board.projectKey = boardDetailsResponse.data.location.projectKey;
      } catch (error) {
        console.error(`Error fetching project details for board ${board.name}:`, error);
        continue;
      }

      const epicOptions = {
        method: 'GET',
        url: `${jiraUrl}/rest/agile/1.0/board/${board.boardId}/epic`,
        headers: {
          Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`,
          'Content-Type': 'application/json'
        }
      };

      try {
        const epicResponse = await axios(epicOptions);
        logger.info(`Epics for ${board.name}:`, epicResponse.data);
        const epics = epicResponse.data.values.map(epic => ({
          epicId: epic.id,
          key: epic.key,
          name: epic.summary
        }));
        board.epics = epics;
      } catch (error) {
        console.error(`Error fetching epics for board ${board.name}:`, error);
      }
    }

    await JiraBoard.deleteMany({});
    await JiraBoard.insertMany(boards);
    console.log('Jira boards updated with project keys and epics.');
  } catch (error) {
    console.error('Error fetching Jira boards:', error);
  }
}

async function fetchJiraContributors() {
  const options = {
    method: 'GET',
    url: `${jiraUrl}/rest/api/3/user/assignable/search?project=${projectKey}`,
    headers: {
      Authorization: `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await axios(options);
    const contributors = response.data.map(user => ({
      accountId: user.accountId,
      displayName: user.displayName
    }));

    await JiraContributor.deleteMany({});
    await JiraContributor.insertMany(contributors);
    console.log('Jira contributors updated.');
    return contributors; // Ensure this function returns the contributors list
  } catch (error) {
    console.error('Error fetching Jira contributors:', error);
    return [];
  }
}

async function getUserById(userId) {
  const contributors = await fetchJiraContributors();
  return contributors.find(user => user.accountId === userId) || null;
}

async function fetchChannelMappings() {
  try {
    const mappings = await ChannelMapping.find({});
    if (!mappings) throw new Error('No channel mappings found');

    console.log('Channel mappings fetched from database.');
    return mappings;
  } catch (error) {
    console.error('Error fetching channel mappings:', error);
  }
}

async function fetchLinks() {
  const notionLinks = [
    { category: 'notion', text: "Employee Directory", url: "https://www.notion.so/moseiki/e68e6f5219ec4d5bae8fbe0689860b7d?v=e1a7d9d1d5134bfa91ccc5923f74555c&pvs=4" },
    { category: 'notion', text: "Meeting Notes", url: "https://www.notion.so/moseiki/9ff29d36ed114a599cfe7384452a579f?v=b6f3883d68b0408f9bdb38a562a61db0&pvs=4" },
    { category: 'notion', text: "Release Notes", url: "https://www.notion.so/moseiki/fc0fbcb9e67c417ca6257b95c4a8539b?v=ea72be6eff314fa9931a7f09a8880de2&pvs=4" }
  ];

  const jiraLinks = [
    { category: 'jira', text: "Jira - Backend", url: "https://moseikiapp.atlassian.net/jira/software/projects/BACMOS/list" },
    { category: 'jira', text: "Jira - Product", url: "https://moseikiapp.atlassian.net/jira/software/projects/MOP/list" },
    { category: 'jira', text: "Jira - Web", url: "https://moseikiapp.atlassian.net/jira/software/projects/WEB/list" },
    { category: 'jira', text: "Jira - Bug Reports", url: "https://moseikiapp.atlassian.net/browse/MOP-87" }
  ];

  const figmaLinks = [
    { category: 'figma', text: "Figma - App", url: "https://www.figma.com/design/DGWmpECVwekRgljaMOYGXb/Moseiki-App?node-id=1-23564&t=o67iYRLbjf2Mcnnq-1" },
    { category: 'figma', text: "Figma - Web", url: "https://www.figma.com/design/wNsH2jaZy1dt0tFE94XFq3/Moseiki-Web-Site-1.0?node-id=149-2015&t=o67iYRLbjf2Mcnnq-1" },
    { category: 'figma', text: "Help Center", url: "https://moseiki.gitbook.io/help-center/" }
  ];

  const allLinks = [...notionLinks, ...jiraLinks, ...figmaLinks];

  await Link.deleteMany({});
  await Link.insertMany(allLinks);
  console.log('Links updated.');
}

async function getSavedDevices(userId) {
  try {
    const devices = await Device.find({ userId });
    return devices;
  } catch (error) {
    logger.error(`Error fetching devices for user ${userId}: ${error.message}`);
    return [];
  }
}

module.exports = {
  fetchJiraBoards,
  fetchJiraContributors,
  fetchChannelMappings,
  fetchLinks,
  getSavedDevices,
  getUserById
};
