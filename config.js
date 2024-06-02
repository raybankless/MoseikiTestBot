require('dotenv').config();
module.exports = {
  telegramToken: process.env.TELEGRAM_TOKEN,
  jiraEmail: process.env.JIRA_EMAIL,
  jiraApiToken: process.env.JIRA_API_TOKEN,
  jiraUrl: process.env.JIRA_URL,
  projectKey: process.env.PROJECT_KEY,
  port: process.env.PORT || 3000,
  "appVersions": [
    "0.0.10",
    "0.0.14"
  ],
  "operatingSystems": [
    "IOS",
    "Android"
  ],
  "bugAssignees": {
    "Moseici Docs": "70121:3903dcf1-aa38-4e77-9f93-ed143ceef68f",
    "Test Groupy": "712020:28c1274b-77b1-4796-ad94-cba6d6d84b3a",
    "Moseici Flutter": "712020:a23804a1-3bca-45ab-a5ca-a4d73ea0d9b1",
    "Backend": "712020:00cee1fb-fcd9-49d9-92cf-e25c402d813b"
  }
};