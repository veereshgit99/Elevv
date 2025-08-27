// Content script to parse job information from various job sites

function isJobPage() {
  const url = window.location.href;

  // As requested, this logic now considers a page a valid job page on LinkedIn

  const isLinkedInJobPage =
    url.includes("linkedin.com/jobs/search") ||
    url.includes("linkedin.com/jobs/collections") ||
    url.includes("linkedin.com/jobs/view");

  const isIndeedPage = url.includes("indeed.com");

  return isLinkedInJobPage || isIndeedPage;
}

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
        continue;
      }
    }
    return null;
  }


  parseCurrentPage() {
    const hostname = window.location.hostname.replace("www.", "");
    const parser = this.parsers[hostname];
    return parser ? parser() : { jobTitle: "", companyName: "", jobDescription: "" };

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

// --- THIS IS THE NEW LOGIC TO ADD AT THE BOTTOM ---
const parser = new JobParser();

function smartObserveAndParse(timeout = 7000) {
  return new Promise((resolve) => {
    // This function attempts a full parse and checks the quality of the data.
    const attemptParse = () => {
      if (!isJobPage()) return null;
      const data = parser.parseCurrentPage();
      // A "successful" parse requires a title AND a description of reasonable length.
      if (data.jobTitle && data.jobDescription && data.jobDescription.length > 100) {
        return data;
      }
      return null; // The data is not complete yet.
    };

    // First, check if the content is already there on initial call.
    const initialData = attemptParse();
    if (initialData) {
      resolve(initialData);
      return;
    }

    const observer = new MutationObserver(() => {
      const data = attemptParse();
      if (data) {
        // We have a complete parse, so we're done.
        clearTimeout(timer);
        observer.disconnect();
        resolve(data);
      }
    });

    // Set a timeout to stop waiting and return whatever we have.
    const timer = setTimeout(() => {
      observer.disconnect();
      console.warn("Elevv: Timed out waiting for full job content. Returning best effort.");
      resolve(parser.parseCurrentPage()); // Return one last attempt
    }, timeout);

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// --- Main message listener (popup/background can request a parse) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "parseJob") {
    if (!isJobPage()) {
      // Not a job page → return empty but don't send PARSE_FAILED
      sendResponse({});
      return true;
    }

    smartObserveAndParse().then((jobData) => {
      if (!jobData || !jobData.jobTitle || !jobData.jobDescription) {
        // Only mark as failed if we ARE on a job page but parsing didn’t succeed
        chrome.runtime.sendMessage({ type: "PARSE_FAILED" }, () => {
          if (chrome.runtime.lastError) {
            // no popup listening, safe to ignore
          }
        });
      }
      sendResponse(jobData || {}); // always return something
    });
    return true; // Keep message channel open for async response
  }
});


