# AIService/agents/web_scraper_agent.py

from typing import Dict, Any, List, Optional
from agents.base import BaseAgent, AgentType, AgentResult, DocumentContext
import os
import json
import logging
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

# Optional: For dynamic content (requires installing playwright)
# from playwright.async_api import async_playwright

logger = logging.getLogger(__name__)

class WebScraperAgent(BaseAgent):
    """
    Agent responsible for fetching and extracting content from web pages.
    Acts as an MCP-like tool for obtaining external web-based information.
    """
    
    def __init__(self):
        super().__init__(AgentType.WEB_SCRAPER)
        # LLM client is not used for scraping itself, but included for consistency if needed for future sub-tasks
        # self.openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY")) 
        # self.llm_model = "gpt-4o"
        self.logger.info("WebScraperAgent initialized.")

    async def process(self, context: DocumentContext) -> AgentResult:
        """
        Fetches content from a given URL. The URL should be provided in context.metadata.
        Expected context.metadata: {"url": "https://example.com"}
        """
        try:
            target_url = context.metadata.get('url')
            if not target_url:
                raise ValueError("WebScraperAgent requires a 'url' in context.metadata to process.")
            
            self.logger.info(f"Attempting to scrape URL: {target_url}")

            # Basic HTTP GET request
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
            }
            response = requests.get(target_url, headers=headers, timeout=10)
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

            # Parse HTML content
            soup = BeautifulSoup(response.text, 'html.parser')

            # Extract main readable content (heuristics based)
            # Prioritize common article/main content tags
            main_content_tags = ['article', 'main', 'div', 'section', 'p', 'h1', 'h2', 'h3', 'li']
            extracted_text_parts = []

            for tag_name in main_content_tags:
                for element in soup.find_all(tag_name):
                    # Filter out common non-content elements (nav, footer, script, style)
                    if element.find_parents(['nav', 'footer', 'script', 'style', 'header', 'aside']):
                        continue
                    # Basic length check to avoid very short or empty elements
                    if len(element.get_text(strip=True)) > 50: 
                        extracted_text_parts.append(element.get_text(separator=' ', strip=True))
            
            # If specific content tags didn't yield much, fall back to body text
            if not extracted_text_parts and soup.body:
                 extracted_text_parts.append(soup.body.get_text(separator=' ', strip=True))

            full_text = "\n\n".join(extracted_text_parts)

            # --- Optional: Playwright for dynamic content ---
            # If requests/BeautifulSoup is insufficient for JS-rendered content,
            # you would uncomment and use playwright.
            # async with async_playwright() as p:
            #     browser = await p.chromium.launch()
            #     page = await browser.new_page()
            #     await page.goto(target_url)
            #     full_text = await page.inner_text('body') # Or a more specific selector
            #     await browser.close()

            if not full_text.strip():
                self.logger.warning(f"No substantial content extracted from {target_url}")
                # Even if no text, return success with empty content
                return AgentResult(
                    agent_type=self.agent_type,
                    success=True,
                    data={
                        "url": target_url,
                        "extracted_content": "",
                        "status": "no_content_extracted"
                    },
                    confidence=0.5,
                    processing_time=0.0
                )

            # For company context, often useful to get the domain and base URL
            parsed_url = urlparse(target_url)
            base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
            domain = parsed_url.netloc.replace('www.', '')

            return AgentResult(
                agent_type=self.agent_type,
                success=True,
                data={
                    "url": target_url,
                    "extracted_content": full_text,
                    "base_url": base_url,
                    "domain": domain,
                    "status": "success"
                },
                confidence=0.9,
                processing_time=0.0
            )
            
        except requests.exceptions.Timeout:
            self.logger.error(f"Web scraping failed: Timeout accessing {target_url}", exc_info=True)
            raise ConnectionError(f"Failed to scrape {target_url}: Request timed out.")
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Web scraping failed for {target_url}: {str(e)}", exc_info=True)
            raise ConnectionError(f"Failed to scrape {target_url}: {str(e)}")
        except Exception as e:
            self.logger.error(f"Unexpected error during web scraping: {str(e)}", exc_info=True)
            raise

    def get_capabilities(self) -> Dict[str, Any]:
        """Return agent capabilities"""
        return {
            "name": "Web Scraper",
            "description": "Fetches raw text content from specified URLs. Used for obtaining company context, JD content from URLs, etc.",
            "input_requirements": ["URL in DocumentContext.metadata['url']"],
            "output_format": "Structured JSON with 'url', 'extracted_content', 'base_url', 'domain'",
            "features": [
                "HTTP GET requests",
                "HTML parsing with BeautifulSoup",
                "Basic content extraction heuristics",
                "Error handling for network issues",
                # "Optional: Playwright for dynamic content (requires install)"
            ],
            "confidence_level": 0.8 # Varies based on website complexity
        }