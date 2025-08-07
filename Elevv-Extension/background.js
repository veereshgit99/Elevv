let user = null; // Caches the user's session data
const SESSION_URL = 'https://elevv.net/api/auth/session';

// This function fetches the session and updates the cache
async function checkAuthStatus() {
    try {
        const response = await fetch(SESSION_URL);
        const sessionData = await response.json();

        if (sessionData && Object.keys(sessionData).length > 0) {
            // Include the accessToken with the user data
            user = {
                ...sessionData.user,
                accessToken: sessionData.accessToken,
                expires: sessionData.expires
            };
            console.log('Auth status updated. User is:', user.email);
            console.log('AccessToken included:', !!user.accessToken);
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
// Listens for requests from the popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'GET_AUTH_STATUS') {
        // Immediately respond with the cached user data for a fast UI load
        sendResponse(user);
    } else if (request.type === 'REFRESH_AUTH_STATUS') {
        // Force a fresh check, then respond with the new data
        checkAuthStatus().then(() => {
            sendResponse(user);
        });
    }
    // `return true` is required to indicate you will send a response asynchronously
    return true;
});


// --- PROACTIVE REFRESH LOGIC ---

// 1. Refresh when a user navigates on your website
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Check if the updated tab's URL is on your domain and the page has finished loading
    if (tab.url && tab.url.startsWith('https://elevv.net') && changeInfo.status === 'complete') {
        console.log('Website activity detected, refreshing auth status...');
        checkAuthStatus();
    }
});

// 2. Refresh when the popup is opened
chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'popup') {
        console.log('Popup opened, refreshing auth status...');
        checkAuthStatus();
        port.onDisconnect.addListener(() => {
            // Optional: clean-up logic when popup closes
        });
    }
});


// 3. Initial check on install/startup
chrome.runtime.onInstalled.addListener(checkAuthStatus);
chrome.runtime.onStartup.addListener(checkAuthStatus);