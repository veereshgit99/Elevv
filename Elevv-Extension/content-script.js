// Content script to parse job information from various job sites
class JobParser {
  constructor() {
    this.parsers = {
      "linkedin.com": this.parseLinkedIn.bind(this),
      "indeed.com": this.parseIndeed.bind(this),
      "glassdoor.com": this.parseGlassdoor.bind(this),
      "jobs.google.com": this.parseGoogleJobs.bind(this),
      "monster.com": this.parseMonster.bind(this),
    }
  }

  // Main parsing function
  parseCurrentPage() {
    const hostname = window.location.hostname.replace("www.", "")
    const parser = this.parsers[hostname]

    if (parser) {
      return parser()
    }

    return this.parseGeneric()
  }

  // LinkedIn job parsing
  parseLinkedIn() {
    const jobTitle =
      document.querySelector(".top-card-layout__title")?.textContent?.trim() ||
      document.querySelector("h1")?.textContent?.trim()

    const companyName =
      document.querySelector(".topcard__flavor-row .topcard__flavor--black-link")?.textContent?.trim() ||
      document.querySelector(".top-card-layout__card .topcard__org-name-link")?.textContent?.trim()

    const jobDescription =
      document.querySelector(".description__text")?.textContent?.trim() ||
      document.querySelector(".jobs-box__html-content")?.textContent?.trim()

    return {
      jobTitle: jobTitle || "",
      companyName: companyName || "",
      jobDescription: jobDescription || "",
    }
  }

  // Indeed job parsing
  parseIndeed() {
    const jobTitle =
      document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() ||
      document.querySelector("h1")?.textContent?.trim()

    const companyName =
      document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() ||
      document.querySelector(".icl-u-lg-mr--sm")?.textContent?.trim()

    const jobDescription =
      document.querySelector("#jobDescriptionText")?.textContent?.trim() ||
      document.querySelector(".jobsearch-jobDescriptionText")?.textContent?.trim()

    return {
      jobTitle: jobTitle || "",
      companyName: companyName || "",
      jobDescription: jobDescription || "",
    }
  }

  // Glassdoor job parsing
  parseGlassdoor() {
    const jobTitle =
      document.querySelector('[data-test="job-title"]')?.textContent?.trim() ||
      document.querySelector("h2")?.textContent?.trim()

    const companyName =
      document.querySelector('[data-test="employer-name"]')?.textContent?.trim() ||
      document.querySelector(".strong")?.textContent?.trim()

    const jobDescription =
      document.querySelector('[data-test="jobDescriptionContent"]')?.textContent?.trim() ||
      document.querySelector(".desc")?.textContent?.trim()

    return {
      jobTitle: jobTitle || "",
      companyName: companyName || "",
      jobDescription: jobDescription || "",
    }
  }

  // Google Jobs parsing
  parseGoogleJobs() {
    const jobTitle =
      document.querySelector('h2[jsname="r4nke"]')?.textContent?.trim() ||
      document.querySelector("h1")?.textContent?.trim()

    const companyName = document.querySelector('[jsname="qLeWe"]')?.textContent?.trim()

    const jobDescription = document.querySelector('[jsname="WbUQNb"]')?.textContent?.trim()

    return {
      jobTitle: jobTitle || "",
      companyName: companyName || "",
      jobDescription: jobDescription || "",
    }
  }

  // Monster job parsing
  parseMonster() {
    const jobTitle =
      document.querySelector('h1[data-testid="svx-job-title"]')?.textContent?.trim() ||
      document.querySelector("h1")?.textContent?.trim()

    const companyName = document.querySelector('[data-testid="svx-job-company-name"]')?.textContent?.trim()

    const jobDescription = document.querySelector('[data-testid="svx-job-description-content"]')?.textContent?.trim()

    return {
      jobTitle: jobTitle || "",
      companyName: companyName || "",
      jobDescription: jobDescription || "",
    }
  }

  // Generic fallback parser
  parseGeneric() {
    // Try to find job title in common selectors
    const jobTitle =
      document.querySelector("h1")?.textContent?.trim() ||
      document.querySelector('[class*="title"]')?.textContent?.trim() ||
      document.querySelector('[class*="job-title"]')?.textContent?.trim()

    // Try to find company name
    const companyName =
      document.querySelector('[class*="company"]')?.textContent?.trim() ||
      document.querySelector('[class*="employer"]')?.textContent?.trim()

    // Try to find job description
    const jobDescription =
      document.querySelector('[class*="description"]')?.textContent?.trim() ||
      document.querySelector('[class*="job-desc"]')?.textContent?.trim()

    return {
      jobTitle: jobTitle || "",
      companyName: companyName || "",
      jobDescription: jobDescription || "",
    }
  }
}

// Listen for messages from popup
window.chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "parseJob") {
    const parser = new JobParser()
    const jobData = parser.parseCurrentPage()
    sendResponse(jobData)
  }
})

// Initialize parser
const jobParser = new JobParser()
