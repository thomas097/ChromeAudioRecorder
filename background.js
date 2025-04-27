// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getTabTitle') {
    // Get the active tab's title
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        sendResponse({ tabTitle: tabs[0].title });
      } else {
        sendResponse({ tabTitle: 'Unknown' });
      }
    });

    // Ensure the listener is asynchronous by returning true
    return true;
  }
});

