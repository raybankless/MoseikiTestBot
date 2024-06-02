// utils/file.js
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');
const FormData = require('form-data');
const { jiraEmail, jiraApiToken, jiraUrl } = require('../config');

async function downloadFile(url, filepath) {
  await fs.ensureDir(path.dirname(filepath));
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });
  await new Promise((resolve, reject) => {
    const stream = response.data.pipe(fs.createWriteStream(filepath));
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function uploadFileToJira(issueKey, localFilePath) {
  const formData = new FormData();
  formData.append('file', fs.createReadStream(localFilePath));

  const options = {
    method: 'POST',
    url: `${jiraUrl}/rest/api/3/issue/${issueKey}/attachments`,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64')}`,
      'X-Atlassian-Token': 'no-check',
      ...formData.getHeaders()
    },
    data: formData
  };

  try {
    const response = await axios(options);
    return response.data;
  } catch (error) {
    console.error(`Failed to upload file to Jira: ${error.response ? JSON.stringify(error.response.data) : error.message}`);
    throw error;
  } finally {
    // Delete the temporary file after uploading
    await fs.remove(localFilePath);
  }
}

module.exports = {
  downloadFile,
  uploadFileToJira
};
