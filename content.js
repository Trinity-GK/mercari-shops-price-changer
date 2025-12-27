// Content script - runs in the context of web pages

console.log("Content script loaded");

// Example: Modify page content
function initContentScript() {
  // Your content script logic here
  console.log("Content script initialized on:", window.location.href);
  
  // Example: Send message to background script
  browser.runtime.sendMessage({
    action: "pageLoaded",
    url: window.location.href
  }).catch((error) => {
    console.error("Error sending message:", error);
  });
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initContentScript);
} else {
  initContentScript();
}

// Listen for messages from background or popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getPageInfo") {
    sendResponse({
      url: window.location.href,
      title: document.title
    });
  }
  return true;
});

