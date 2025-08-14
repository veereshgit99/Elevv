// Content script to parse job information from various job sites
class JobParser {
  constructor() {
    this.parsers = {
      "linkedin.com": this.parseLinkedIn.bind(this),
      "indeed.com": this.parseIndeed.bind(this),
    }
  }

  /**
   * Helper function to try multiple selectors in order.
   * @param {string[]} selectors - An array of CSS selectors to try.
   * @returns {string|null} - The text content of the first matching element, or null.
   */

  async _trySelectorsWithRetry(selectors, maxRetries = 3, delay = 1000) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = this._trySelectors(selectors);
      if (result) return result;

      // Wait for dynamic content to load
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  _trySelectorsWithDelay(selectors, delay = 1000) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const result = this._trySelectors(selectors);
        resolve(result);
      }, delay);
    });
  }



  _trySelectors(selectors) {
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.innerText || element.textContent;
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      } catch (error) {
        console.warn(`Selector failed: ${selector}`, error);
        continue;
      }
    }
    return null;
  }


  parseCurrentPage() {
    const hostname = window.location.hostname.replace("www.", "");
    const parser = this.parsers[hostname];
    return parser ? parser() : this.parseGeneric();
  }

  // In your content-script.js file

  parseLinkedIn() {
    const jobTitle = this._trySelectors([
      // Most current LinkedIn selectors (2025)
      '.top-card-layout__title h1',
      '.top-card-layout__title a',
      '.top-card-layout__entity-info h1',
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title h1',

      // Alternative current selectors
      'h1[data-automation-id="job-title"]',
      '.jobs-unified-top-card__job-title a',
      '.topcard__title',

      // Fallback patterns
      'h1[class*="job-title"]',
      'h1[class*="title"]',
      '[data-tracking-control-name="public_jobs_topcard_job_title"] h1',

      // Generic fallbacks
      '.top-card h1',
      'main h1'
    ]);

    const companyName = this._trySelectors([
      // Most current LinkedIn selectors (2024/2025)
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',

      // Alternative current selectors
      'a[data-tracking-control-name="public_jobs_topcard_company_link"]',
      'a[data-tracking-control-name="public_jobs_topcard-org-name"]',

      // Fallback selectors for different LinkedIn layouts
      '.top-card-layout__second-subline a',
      '.jobs-top-card__company-url',
      '.topcard__org-name-link',
      '.topcard__flavor-row .topcard__flavor--black-link',

      // Generic fallbacks
      'a[href*="/company/"]',
      '[class*="company"] a',
      '[class*="company-name"]'
    ]);


    // Try multiple selectors for job description
    let jobDescription = this._trySelectors([
      // Current LinkedIn selectors
      '.description__text',
      '.jobs-description__content',
      '.jobs-box__html-content',
      '.jobs-description-content__text',

      // Alternative selectors
      '[data-automation-id="job-description"]',
      '.jobs-unified-description',
      '.jobs-description',

      // Fallback patterns
      '[class*="description"] div[class*="text"]',
      '[class*="job-description"]',

      // Generic fallbacks
      '.description',
      '[id*="description"]'
    ]);

    // Clean up the description
    if (jobDescription) {
      // Remove excessive whitespace and clean HTML artifacts
      jobDescription = jobDescription
        .replace(/\s+/g, ' ')
        .replace(/•/g, '\n•')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    }

    return {
      jobTitle: jobTitle || "",
      companyName: companyName || "",
      jobDescription: jobDescription || "",
    };
  }

  // Indeed job parsing
  parseIndeed() {
    const jobTitle = this._trySelectors([
      // Current Indeed selectors
      '[data-jk] h1',
      '.jobsearch-JobInfoHeader-title',
      '.jobsearch-JobInfoHeader-title span[title]',
      'h1[data-testid="job-title"]',

      // Alternative selectors
      '.jobsearch-DesktopStickyContainer h1',
      '[data-testid="job-details"] h1',
      '.jobsearch-JobComponent-description h1',

      // Fallback patterns
      'h1[class*="title"]',
      'h1[class*="job"]',

      // Generic fallbacks
      'main h1',
      'article h1'
    ]);

    const companyName = this._trySelectors([
      '[data-testid="inlineHeader-companyName"]',
      'div[data-company-name="true"]',
      '.icl-u-lg-mr--sm'
    ]);

    let jobDescription = this._trySelectors([
      // Current Indeed selectors
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText',
      '[data-testid="job-description"]',
      '.jobsearch-JobComponent-description div[id*="description"]',

      // Alternative selectors
      '.jobsearch-DesktopStickyContainer [id*="description"]',
      '.jobsearch-JobInfoHeader-jobDescription',

      // Fallback patterns
      '[class*="job-description"]',
      '[class*="description-text"]',

      // Generic fallbacks
      '.description',
      '[id*="description"]'
    ]);

    // Clean up the description
    if (jobDescription) {
      jobDescription = jobDescription
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    return {
      jobTitle: jobTitle || "",
      companyName: companyName || "",
      jobDescription: jobDescription || ""
    };
  }

}

// Listen for messages from popup
window.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "parseJob") {
    const parser = new JobParser();
    const jobData = parser.parseCurrentPage();
    sendResponse(jobData);
  }
});

// --- THIS IS THE NEW LOGIC TO ADD AT THE BOTTOM ---

let lastUrl = location.href;
const parser = new JobParser();

// Function to run the parser and send data if the URL has changed
function handleUrlChange() {
  // A short delay to ensure the new page content has loaded
  setTimeout(() => {
    const jobData = parser.parseCurrentPage();
    // Send the new data to the extension's UI
    chrome.runtime.sendMessage({ type: "JOB_DATA_UPDATED", payload: jobData });
  }, 500); // 500ms delay
}

// Set up a MutationObserver to watch for changes in the page body
const observer = new MutationObserver((mutations) => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log("URL changed to:", lastUrl);
    handleUrlChange();
  }
});

// Start observing the body for changes
observer.observe(document.body, {
  childList: true,
  subtree: true,
});

// Listen for the initial request from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "parseJob") {
    const jobData = parser.parseCurrentPage();
    sendResponse(jobData);
  }
});

