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
            console.log('Auth status updated and saved to storage. User is:', user.email);
        } else {
            // Remove the user from storage on logout
            await chrome.storage.local.remove('user');
            console.log('Auth status updated. User logged out, session removed from storage.');
        }
    } catch (error) {
        console.error('Error checking auth status:', error);
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
    checkAuthStatus(); // Initial auth check on install

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