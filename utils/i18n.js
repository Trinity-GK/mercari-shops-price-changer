// i18n helper utility for Firefox extensions

/**
 * Get localized string
 * @param {string} messageName - The message key
 * @param {string[]} substitutions - Optional substitutions
 * @returns {Promise<string>}
 */
async function getMessage(messageName, substitutions = []) {
  try {
    return await browser.i18n.getMessage(messageName, substitutions);
  } catch (error) {
    console.error(`Error getting message ${messageName}:`, error);
    return messageName;
  }
}

/**
 * Get localized string synchronously (for use in content scripts)
 * @param {string} messageName - The message key
 * @param {string[]} substitutions - Optional substitutions
 * @returns {string}
 */
function getMessageSync(messageName, substitutions = []) {
  try {
    return browser.i18n.getMessage(messageName, substitutions);
  } catch (error) {
    console.error(`Error getting message ${messageName}:`, error);
    return messageName;
  }
}

// Export for use in modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { getMessage, getMessageSync };
}

