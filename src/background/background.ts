/**
 * Background Service Worker
 * Opens the side panel when the extension icon is clicked.
 */
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((err: unknown) => console.error('Failed to set panel behavior:', err));
