// Caches the user's session data
let user = null;
const SESSION_URL = 'https://elevv.net/api/auth/session';

// This function fetches the session and updates the cache
async function checkAuthStatus() {
    try {
        const response = await fetch(SESSION_URL);
        const sessionData = await response.json();

        if (sessionData && Object.keys(sessionData).length > 0) {
            user = { ...sessionData.user, accessToken: sessionData.accessToken, expires: sessionData.expires };
            console.log('Auth status updated. User is:', user.email);
        } else {
            user = null;
            console.log('Auth status updated. User is not authenticated.');
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
        user = null;
    }
}

// --- MESSAGE LISTENER ---
// Listens for requests from the side panel UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_AUTH_STATUS') {
        sendResponse(user);
    } else if (request.type === 'REFRESH_AUTH_STATUS') {
        checkAuthStatus().then(() => {
            sendResponse(user);
        });
    }
    // `return true` is required for asynchronous responses
    return true;
});

// --- SIDEPANEL & ICON CLICK LOGIC ---
// Open the side panel when the user clicks the toolbar icon.
chrome.action.onClicked.addListener((tab) => {
    chrome.sidePanel.open({ tabId: tab.id });
});

// --- PROACTIVE REFRESH & SETUP LOGIC ---

// Listen for when the side panel is connected (opened)
chrome.runtime.onConnect.addListener(port => {
    // FIX: Consolidated the two onConnect listeners from your original file.
    // The manifest uses a 'side_panel', so we only need to listen for that.
    if (port.name === 'sidepanel') {
        console.log('Side panel opened, refreshing auth status...');
        checkAuthStatus();
    }
});

// Refresh auth when user activity is detected on your website
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.url && tab.url.startsWith('https://elevv.net') && changeInfo.status === 'complete') {
        console.log('Website activity detected, refreshing auth status...');
        checkAuthStatus();
    }
});

// Perform initial setup and checks
chrome.runtime.onInstalled.addListener(() => {
    // 1. Initial auth check on install
    checkAuthStatus();

    // 2. NEW: Set rules to enable the icon only on specific sites
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