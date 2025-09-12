import fitz  # PyMuPDF
import json
import os
from dotenv import load_dotenv

# NEW: Import the Google AI library
import google.generativeai as genai

# NEW: Load environment variables from .env file
load_dotenv()

# NEW: Configure the Gemini API client with your key
try:
    genai.configure(api_key="AIzaSyA0FaZvXm7gTxKZqnuSYUjW6-ZveArUtio")
except KeyError:
    print("❌ ERROR: GEMINI_API_KEY not found. Please create a .env file.")
    exit()


# -------- STEP 1: Extract text from PDF (No changes here) --------
def extract_text_from_pdf(file_path):
    doc = fitz.open(file_path)
    text = "\n".join(page.get_text("text") for page in doc)
    doc.close()
    return text

# -------- STEP 2: Call LLM to parse resume --------
def parse_resume_with_llm(resume_text):
    # The corrected prompt with doubled braces for the schema
    prompt = f"""
        You are a resume parser. Your only job is to faithfully extract the resume content into the provided JSON structure.

        {{{{
            "contactInfo": {{{{
                "name": "",
                "email": "",
                "phone": "",
                "links": [
                    {{{{
                        "label": "(e.g., LinkedIn, GitHub, Portfolio, or any other profiles found)",
                        "url": ""
                    }}}}
                ]
            }}}},
          "summary": "",
          "skills": {{{{
            "Category or Skills": ["skill1", "skill2"]
          }}}},
          "experience": [
            {{{{
              "role": "",
              "company": "",
              "location": "",
              "start": {{{{ "month": "", "year": "" }}}},
              "end": {{{{ "month": "", "year": "" }}}},
              "bullets": []
            }}}}
          ],
          "projects": [
            {{{{
              "name": "",
              "technologies": "",
              "start": {{{{ "month": "", "year": "" }}}},
              "end": {{{{ "month": "", "year": "" }}}},
              "bullets": []
            }}}}
          ],
          "education": [
            {{{{
              "school": "",
              "degree": "",
              "location": "",
              "start": {{{{ "month": "", "year": "" }}}},
              "end": {{{{ "month": "", "year": "" }}}},
              "coursework": "Course1, Course2, Course3",.....,
              "gpa": "3.9/4.0"
            }}}},
          ],
          "publications": [
            "Publication title and details as they appear in resume"
          ],
          "achievements": [ 
            "Achievement description as written in resume" // May be awards, honors, scholarships, extracurriculars, etc.
          ],
        }}}}

        STRICT RULES:
        - Do NOT infer, rephrase, or generate new information.
        - Only preserve what is explicitly written in the original resume.
        - If a field is not present, leave it empty or as an empty list.
        - For projects, publications, achievements, coursework, etc.:
          • If they are written as bullet points, preserve them as bullet points only.
          • Do NOT create fields such as "name", "technologies", "dates" unless they are explicitly written in the resume.
        - Always maintain the original wording, spelling, and order from the resume.
        - Do not try to “improve” or “expand” content.
        - Output ONLY valid JSON - No explanations or text outside JSON.

        Resume text:
        \"\"\"
        {resume_text}
        \"\"\"
        """

    # --- CHANGED: This block now uses the Gemini API ---
    try:
        # Configure the model to use gemini-2.5-pro and to output JSON
        generation_config = genai.GenerationConfig(response_mime_type="application/json")
        model = genai.GenerativeModel('gemini-2.5-pro', generation_config=generation_config)
        
        response = model.generate_content(prompt)
        content = response.text
        
    except Exception as e:
        print(f"❌ Gemini API call failed:", e)
        raise

    # --- END OF CHANGES ---

    # Validate JSON (No changes here)
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as e:
        print("❌ JSON decode failed:", e)
        print("Raw output:", content)
        raise

    return parsed

# -------- STEP 3: Test run (No changes here) --------
if __name__ == "__main__":
    # Option A: Parse from PDF
    resume_text = extract_text_from_pdf("Veeresh_Resume.pdf")

    parsed_json = parse_resume_with_llm(resume_text)

    print("\n✅ Parsed Resume JSON:\n")
    print(json.dumps(parsed_json, indent=2))