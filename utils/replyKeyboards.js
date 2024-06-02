// utils/replKeyboards.js
function getOperatingSystemKeyboard(operatingSystems) {
  const buttons = operatingSystems.map((os) => [{ text: os }]);
  return { reply_markup: { keyboard: buttons, one_time_keyboard: true, resize_keyboard: true } };
}

function getAppVersionKeyboard(appVersions) {
  const buttons = appVersions.map((version) => [{ text: version }]);
  return { reply_markup: { keyboard: buttons, one_time_keyboard: true, resize_keyboard: true } };
}

module.exports = {
  getOperatingSystemKeyboard,
  getAppVersionKeyboard
};

