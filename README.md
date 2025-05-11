# Org Protocol Capture Chrome Extension

## About This Extension

This Chrome extension allows you to quickly capture web pages or selected text from your browser directly into Org mode in Emacs using the `org-protocol` URI scheme. When you trigger a capture, a "Captured" message will briefly overlay the current page for visual feedback.

This extension was inspired by and builds upon the concepts of [sprig/org-capture-extension](https://github.com/sprig/org-capture-extension).

## Features

* **Capture Full Page:** Captures the URL and title of the current web page.
    * Invokes: `org-protocol://capture?url=<URL>&title=<Page Title>`
* **Capture Selected Text:** Captures the URL, title of the current web page, and the currently selected text.
    * Invokes: `org-protocol://capture?template=p&url=<URL>&title=<Page Title>&body=<Selected Text>`
* **Context Menu Integration:** Access capture functionality via the right-click context menu.
    * "Capture selection to Org" (appears when text is selected)
    * "Capture page to Org"
* **Toolbar Icon:** Click the extension icon in the Chrome toolbar to capture (prioritizes selected text if present, otherwise captures the page).
* **Keyboard Shortcut:** Use `Ctrl+Shift+C` (Windows/Linux) or `Command+Shift+C` (Mac) to trigger a capture.
* **Visual Feedback:** A "Captured" overlay message appears briefly on the page after a successful capture attempt.
* **Error Notifications:** Basic desktop notifications for errors (e.g., if `org-protocol` fails to launch).

## Permissions Requested

* **`activeTab`**: Allows the extension to access the URL and title of the currently active tab when you interact with the extension.
* **`scripting`**: Allows the extension to execute scripts on the active tab. This is used to:
    * Get the currently selected text.
    * Inject the "Captured" overlay message.
    * Trigger the `org-protocol` URI (by creating a temporary iframe).
* **`contextMenus`**: Allows the extension to add items to the right-click context menu.
* **`notifications`**: Allows the extension to display desktop notifications for errors.
