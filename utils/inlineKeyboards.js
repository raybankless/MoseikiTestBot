// utils/inlineKeyboards.js
function getOperatingSystemKeyboard(operatingSystems) {
  const buttons = operatingSystems.map((os) => [{ text: os, callback_data: `os_${os}` }]);
  return { reply_markup: { inline_keyboard: buttons } };
}

const getAppVersionKeyboard = (appVersions) => {
  const versionButtons = appVersions.map(version => [{ text: version, callback_data: `app_${version}` }]);
  versionButtons.push([{ text: '+ Add New Version', callback_data: 'new_version' }]);
  return { inline_keyboard: versionButtons };
};

const getContinueKeyboard = () => ({
  inline_keyboard: [
    [{ text: "No Upload", callback_data: "bug_continue_no_upload" }]
  ]
});

const getUploadMoreKeyboard = () => ({
  inline_keyboard: [
    [{ text: "Yes", callback_data: "bug_upload_more_yes" }],
    [{ text: "No Upload", callback_data: "bug_continue_no_upload" }]
  ]
});

const getBoardKeyboard = (boards) => {
  const buttons = boards.map(board => ({ text: board.name, callback_data: `board_${board._id.toString()}` }));
  console.log('Board buttons:', buttons); // Debugging log
  return { reply_markup: { inline_keyboard: chunkArray(buttons, 3) } };
};

const getEpicKeyboard = (epics) => {
  const buttons = epics.map(epic => ({ text: epic.name, callback_data: `epic_${epic.key}` })); // Use epic key for callback
  buttons.unshift({ text: 'Epicless', callback_data: 'epicless' });
  console.log('Epic buttons before chunking:', buttons); // Debugging log
  const chunkedButtons = chunkArray(buttons, 3);
  console.log('Chunked epic buttons:', chunkedButtons); // Debugging log
  return { reply_markup: { inline_keyboard: chunkedButtons } };
};

const getAssigneeKeyboard = (contributors) => {
  const buttons = contributors
    .sort((a, b) => a.displayName.localeCompare(b.displayName)) // Sort alphabetically
    .map(contributor => ({ text: contributor.displayName, callback_data: `assignee_${contributor.accountId}` }));
  console.log('Assignee buttons:', buttons); // Debugging log
  return {
    reply_markup: { inline_keyboard: chunkArray(buttons, 3) }
  };
};


function chunkArray(array, chunkSize) {
  const result = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  console.log('Chunked array:', result); // Debugging log
  return result;
}

module.exports = {
  getOperatingSystemKeyboard,
  getAppVersionKeyboard,
  getContinueKeyboard,
  getUploadMoreKeyboard,
  getBoardKeyboard,
  getEpicKeyboard,
  getAssigneeKeyboard
};
