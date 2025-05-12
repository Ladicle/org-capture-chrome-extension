// Create context menus when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "orgCaptureSelection",
        title: "Capture selection to Org",
        contexts: ["selection"] // Show only when text is selected
    });
    chrome.contextMenus.create({
        id: "orgCapturePage",
        title: "Capture page to Org",
        contexts: ["page"] // Show on right-click anywhere on the page (if no selection)
    });
});

// Processing when the toolbar icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
    // When the icon is clicked, first check if there is a selection
    handleCaptureAttempt(tab);
});

// Processing when a command (shortcut key) is executed
chrome.commands.onCommand.addListener(async (command, tab) => {
    if (command === "_execute_action") {
        handleCaptureAttempt(tab);
    }
});

// Processing when a context menu item is clicked
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (!tab || !tab.id) {
        console.error("Target tab is not available for context menu action.");
        notifyError("Could not access the current tab.");
        return;
    }

    if (info.menuItemId === "orgCaptureSelection") {
        // info.selectionText contains the selected text
        processCapture(tab, info.selectionText || "");
    } else if (info.menuItemId === "orgCapturePage") {
        // Page capture, so selectionText is empty
        processCapture(tab, "");
    }
});

// Process capture attempts from icon clicks or shortcut keys
async function handleCaptureAttempt(tab) {
    if (!tab || !tab.id) {
        console.error("Target tab is not available for action click.");
        notifyError("Could not access the current tab.");
        return;
    }

    try {
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.getSelection().toString(),
        });

        let selectionText = "";
        if (results && results[0] && results[0].result) {
            selectionText = results[0].result.trim();
        }
        processCapture(tab, selectionText);

    } catch (e) {
        console.error("Failed to get selection:", e);
        // For pages where script injection might fail (e.g., Chrome Web Store),
        // try to capture with page info only.
        processCapture(tab, ""); // Process as no selection
        notifyError(`Failed to get selected text. Capturing page info only.\nError: ${e.message}`);
    }
}

function replace_all(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function escapeIt(text) {
    return replace_all(replace_all(replace_all(encodeURIComponent(text), "[(]", escape("(")),
        "[)]", escape(")")),
        "[']" ,escape("'"));
}

// Main capture processing function
function processCapture(tab, selectionText) {
    const pageUrl = tab.url || "";
    const pageTitle = tab.title || "";

    // Encode URL, title, and selection text
    const encodedUrl = encodeURIComponent(pageUrl);

    let orgProtocolUrl;
    const trimmedSelection = selectionText.trim();

    // TODO: support template=<template(e.g., p)>
    if (trimmedSelection) {
        const encodedTitle = escapeIt(trimmedSelection+" - "+pageTitle);
        orgProtocolUrl = `org-protocol://capture?url=${encodedUrl}&title=${encodedTitle}`;
    } else {
        const encodedTitle = escapeIt(pageTitle);
        orgProtocolUrl = `org-protocol://capture?url=${encodedUrl}&title=${encodedTitle}`;
    }

    console.log("Generated org-protocol URL:", orgProtocolUrl);

    // Attempt to open the org-protocol URI via iframe
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (urlToOpen) => {
            const existingIframe = document.getElementById('org_protocol_iframe');
            if (existingIframe) {
                existingIframe.remove();
            }
            const iframe = document.createElement('iframe');
            iframe.id = 'org_protocol_iframe';
            iframe.style.display = 'none';
            iframe.src = urlToOpen;
            document.body.appendChild(iframe);
            setTimeout(() => {
                if (iframe.parentNode === document.body) {
                    document.body.removeChild(iframe);
                }
            }, 500);
        },
        args: [orgProtocolUrl]
    }).then(() => {
        // After attempting to open the org-protocol link, show the overlay.
        // We inject the overlay function into the page.
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: showCapturedOverlay, // Call the overlay function defined below
        });
    }).catch(e => {
        console.error("Error opening org-protocol URL or showing overlay:", e);
        notifyError(`Failed to launch org-protocol link or show confirmation.\nError: ${e.message}\nURL: ${orgProtocolUrl}\n\nPlease ensure the org-protocol handler is correctly configured.`);
    });
}

// This function will be injected into the active page to show the overlay.
function showCapturedOverlay() {
    var outer_id = "org-capture-extension-overlay";
    var inner_id = "org-capture-extension-text";
    var style_id = "org-capture-extension-style"; // ID for the style element

    // Remove existing overlay and style if they exist, to prevent duplication
    var existing_outer = document.getElementById(outer_id);
    if (existing_outer) {
        existing_outer.remove();
    }
    var existing_style = document.getElementById(style_id);
    if (existing_style) {
        existing_style.remove();
    }

    var outer_div = document.createElement("div");
    outer_div.id = outer_id;

    var inner_div = document.createElement("div");
    inner_div.id = inner_id;
    inner_div.innerHTML = "Captured"; // Message to display

    outer_div.appendChild(inner_div);
    document.body.appendChild(outer_div);

    var css = document.createElement("style");
    css.id = style_id; // Assign an ID to the style element
    css.type = "text/css";
    css.innerHTML = `#${outer_id} {
    position: fixed; /* Sit on top of the page content */
    display: block; /* Initially visible */
    width: 100%; /* Full width (cover the whole page) */
    height: 100%; /* Full height (cover the whole page) */
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0,0,0,0.2); /* Black background with opacity */
    z-index: 2147483647; /* Max z-index to ensure it's on top */
    cursor: default; /* Change cursor to default */
    opacity: 1;
    transition: opacity 0.5s ease-out; /* Smooth fade-out */
    }

    #${inner_id} {
    position: absolute;
    top: 50%;
    left: 50%;
    font-size: 50px; /* Default font size */
    color: white;
    transform: translate(-50%,-50%);
    -ms-transform: translate(-50%,-50%);
    padding: 20px 40px;
    background-color: rgba(0,0,0,0.7);
    border-radius: 10px;
    text-align: center;
    }

    /* Responsive font size */
    @media (max-width: 600px) {
    #${inner_id} {
    font-size: 30px;
    padding: 15px 30px;
    }
    }`;
    document.head.appendChild(css); // Append style to head to ensure it's applied

    // Make the overlay visible
    outer_div.style.display = "block";

    // Automatically hide the overlay after a short period
    setTimeout(() => {
        outer_div.style.opacity = "0"; // Start fade out
        setTimeout(() => {
            if (outer_div.parentNode === document.body) {
                outer_div.remove();
            }
            // Optionally remove the style element if no longer needed
            // var styleElement = document.getElementById(style_id);
            // if (styleElement) styleElement.remove();
        }, 500); // Corresponds to the transition duration
    }, 700); // How long the message stays fully visible (milliseconds)
}

// Error notification function
function notifyError(message) {
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon32.png',
        title: 'Org Capture Error',
        message: message,
        priority: 2
    });
}
