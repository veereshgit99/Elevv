import requests
import os
import logging
import tempfile

# Import these based on your utils.py content, ensure they are in requirements.txt
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None
try:
    import docx
except ImportError:
    docx = None
try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None
try:
    import pandas as pd
except ImportError:
    pd = None
try:
    from PIL import Image
    import pytesseract
except ImportError:
    Image = None
    pytesseract = None


logger = logging.getLogger(__name__)
# Ensure logger is set up if running directly (optional for local dev)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)


def download_file_to_tmp(url: str) -> tuple[str, str]:
    """
    Downloads a file from a URL to the system's temporary directory and returns its local path and content type.
    """
    logger.info(f"Attempting to download file to temp dir from URL: {url}")
    response = requests.get(url, stream=True)
    response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)

    content_type = response.headers.get("Content-Type", "application/octet-stream")

    # --- CHANGE START ---
    # Use os.environ.get('TMPDIR', ...) to prioritize custom env var, then default system temp
    # This will correctly resolve to /tmp on Lambda, and to a Windows temp path locally.
    base_temp_dir = os.environ.get('TMP', tempfile.gettempdir())
    os.makedirs(base_temp_dir, exist_ok=True) # Ensure the base temp directory exists
    
    # Extract filename from URL or assign a unique one
    filename = url.split("/")[-1].split("?")[0] # Get filename from URL, strip query params
    if not filename or '.' not in filename: # If no clear filename, use UUID
        import uuid
        filename = str(uuid.uuid4())
    
    local_file_path = os.path.join(base_temp_dir, filename) # Use the system-appropriate temp dir
    # --- CHANGE END ---

    with open(local_file_path, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    logger.info(f"File downloaded to {local_file_path} with Content-Type: {content_type}")
    return local_file_path, content_type

def extract_text_content(file_path: str, content_type: str) -> str:
    """
    Extracts text content from a file based on its path and content type.
    Returns extracted text or an error message if unsupported/failed.
    """
    logger.info(f"Extracting text from {file_path} with Content-Type: {content_type}")
    text = ""

    try:
        if fitz and "application/pdf" in content_type:
            pdf = fitz.open(file_path)
            text = "\n".join(page.get_text() for page in pdf)
            pdf.close()
            logger.info("PDF content extracted successfully.")
        
        elif "text/plain" in content_type:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
            logger.info("Plain text content extracted successfully.")
        
        elif docx and (
            "application/msword" in content_type or
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in content_type
        ):
            doc = docx.Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            logger.info("Word document content extracted successfully.")
        
        elif BeautifulSoup and "text/html" in content_type:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                html_content = f.read()
            soup = BeautifulSoup(html_content, "html.parser")
            text = soup.get_text(separator="\n", strip=True)
            logger.info("HTML content extracted successfully.")
        
        elif pd and (
            "application/vnd.ms-excel" in content_type or
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in content_type
        ):
            excel_file = file_path
            df = pd.read_excel(excel_file, sheet_name=None)
            text = "\n".join([df_name + "\n" + df_content.to_string(index=False) for df_name, df_content in df.items()])
            logger.info("Excel content extracted successfully.")

        elif pd and "text/csv" in content_type:
            df = pd.read_csv(file_path)
            text = df.to_string(index=False)
            logger.info("CSV content extracted successfully.")

        elif Image and pytesseract and "image/" in content_type:
            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            if text.strip():
                logger.info("Image OCR successful.")
            else:
                logger.warning("Image file received, but no text detected by OCR.")
                text = f"[Image file processed: {os.path.getsize(file_path)} bytes, no text detected]"
        
        else:
            logger.warning(f"Unhandled content type: {content_type}. Attempting to read as plain text.")
            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    text = f.read()
                logger.info(f"Successfully read unhandled type {content_type} as plain text.")
            except Exception as e:
                logger.error(f"Failed to read unhandled type {content_type} as plain text: {e}")
                text = f"Cannot generate summary: Unhandled content type '{content_type}'. File downloaded and stored temporarily. Please provide content of type: PDF, DOCX, TXT, HTML, Excel, CSV, or a readable image."
            
        if not text.strip():
            return f"Cannot generate summary: No readable text extracted from file with type '{content_type}'. File downloaded and stored temporarily."
        
        return text

    except ImportError as ie:
        logger.error(f"Missing dependency for {content_type} parsing: {ie}", exc_info=True)
        return f"Cannot generate summary: Missing dependency for '{content_type}' file processing. File downloaded and stored temporarily. Error: {ie}"
    except Exception as e:
        logger.error(f"Error during text extraction for {content_type} from {file_path}: {e}", exc_info=True)
        return f"Cannot generate summary: Failed to extract text from file with type '{content_type}'. File downloaded and stored temporarily. Error: {e}"