const SESSION_URL = 'https://elevv.net/api/auth/session';

// This function fetches the session and SAVES it to chrome.storage
async function checkAuthStatus() {
    try {
        const response = await fetch(SESSION_URL);
        const sessionData = await response.json();

        if (sessionData && Object.keys(sessionData).length > 0) {
            const user = {
                ...sessionData.user,
                accessToken: sessionData.accessToken,
                expires: sessionData.expires
            };
            // Save the user session to persistent storage
            await chrome.storage.local.set({ user: user });
        } else {
            // Remove the user from storage on logout
            await chrome.storage.local.remove('user');
        }
    } catch (error) {
        // Ensure user is cleared from storage on error
        await chrome.storage.local.remove('user');
    }
}

// --- MESSAGE LISTENER ---
// Listens for requests from the side panel UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_AUTH_STATUS') {
        // Read the user directly from storage
        chrome.storage.local.get('user', (result) => {
            sendResponse(result.user || null);
        });
        return true; // Indicate you will send a response asynchronously
    }

    if (request.type === 'REFRESH_AUTH_STATUS') {
        // Force a fresh check, which saves the new data to storage, then respond
        checkAuthStatus().then(() => {
            chrome.storage.local.get('user', (result) => {
                sendResponse(result.user || null);
            });
        });
        return true; // Indicate you will send a response asynchronously
    }
});

// --- SIDEPANEL & ICON CLICK LOGIC ---
// Open the side panel when the user clicks the toolbar icon.
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id });
});

// --- PROACTIVE REFRESH & SETUP LOGIC ---

// Listen for when the side panel is connected (opened)
chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'sidepanel') {
        checkAuthStatus();
    }
});

// background.js

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // We only want to act once the page is fully loaded.
    if (changeInfo.status === 'complete' && tab.url) {

        // Keep your existing logic to refresh auth on your main site.
        if (tab.url.startsWith('https://elevv.net')) {
            checkAuthStatus();
        }

        // --- ADD THIS NEW LOGIC ---
        // Check if the user navigated to a supported job site.
        const isSupported =
            tab.url.includes("linkedin.com/jobs") ||
            tab.url.includes("indeed.com");

        if (isSupported) {
            // Send the same message as onActivated to trigger a UI refresh.
            chrome.runtime.sendMessage({ type: 'SUPPORTED_SITE_ACTIVATED' }, (response) => {
                if (chrome.runtime.lastError) {
                    // This is expected if the UI is not open. We can safely ignore it.
                }
            });
        }
        // --- END OF NEW LOGIC ---
    }
});

// background.js

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        const currentUrl = tab.url || "";

        const isSupported =
            currentUrl.includes("linkedin.com/jobs") ||
            currentUrl.includes("indeed.com");

        const message = isSupported ?
            { type: 'SUPPORTED_SITE_ACTIVATED' } :
            { type: 'UNSUPPORTED_SITE_ACTIVATED' };

        // Send the message with proper error handling
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                // This error is expected if the UI is closed. 
                // By catching it here, we prevent the "Uncaught" error 
                // from appearing in the console. We can safely ignore it.
            }
        });

    } catch (error) {
        // This will catch other errors, like if chrome.tabs.get() fails.
        console.warn(`Elevv background error: ${error.message}`);
    }
});

// This will run when the 'auth-refresh' alarm we create goes off
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'auth-refresh') {
        checkAuthStatus();
    }
});

// Perform initial setup and checks
chrome.runtime.onInstalled.addListener(() => {
    checkAuthStatus(); // Initial auth check on install

    // Create an alarm to refresh the auth status every minute
    chrome.alarms.create('auth-refresh', { periodInMinutes: 5 });

    // Set rules to enable the icon only on specific sites
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        const rules = [{
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { hostContains: 'linkedin.com', pathPrefix: '/jobs/view' },
                }),
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: { hostContains: 'indeed.com' },
                })
            ],
            actions: [new chrome.declarativeContent.ShowAction()]
        }];
        chrome.declarativeContent.onPageChanged.addRules(rules);
    });
});

// Refresh auth when the browser starts
chrome.runtime.onStartup.addListener(checkAuthStatus);