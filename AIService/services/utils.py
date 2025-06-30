import requests

def download_file_from_url(url: str) -> str:
    response = requests.get(url)
    response.raise_for_status()

    content_type = response.headers.get("Content-Type", "")
    if "application/pdf" in content_type:
        from io import BytesIO
        import fitz  # PyMuPDF
        pdf = fitz.open(stream=BytesIO(response.content), filetype="pdf")
        text = "\n".join(page.get_text() for page in pdf)
        return text
    
    elif "text/plain" in content_type:
        return response.text
    
    elif (
        "application/msword" in content_type or
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" in content_type
    ):
        from io import BytesIO
        try:
            import docx
        except ImportError:
            raise ImportError("Please install python-docx to handle Word documents.")
        doc = docx.Document(BytesIO(response.content))
        text = "\n".join([para.text for para in doc.paragraphs])
        return text
    
    elif "text/html" in content_type:
        # Extract visible text from HTML
        try:
            from bs4 import BeautifulSoup
        except ImportError:
            raise ImportError("Please install beautifulsoup4 to handle HTML files.")
        soup = BeautifulSoup(response.text, "html.parser")
        text = soup.get_text(separator="\n", strip=True)
        return text
    
    elif (
        "application/vnd.ms-excel" in content_type or
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in content_type
    ):
        # Extract text from Excel files
        from io import BytesIO
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("Please install pandas and openpyxl to handle Excel files.")
        excel_file = BytesIO(response.content)
        try:
            df = pd.read_excel(excel_file, sheet_name=None)
            text = "\n".join([df_name + "\n" + df_content.to_string(index=False) for df_name, df_content in df.items()])
        except Exception as e:
            text = f"[Failed to extract Excel content: {e}]"
        return text

    elif "text/csv" in content_type:
        try:
            import pandas as pd
            df = pd.read_csv(BytesIO(response.content))
            return df.to_string(index=False)
        except Exception as e:
            return f"[Failed to parse CSV: {e}]"

    elif "image/" in content_type:
        # Try OCR for images
        try:
            from PIL import Image
            import pytesseract
            from io import BytesIO
            image = Image.open(BytesIO(response.content))
            text = pytesseract.image_to_string(image)
            if text.strip():
                return text
            else:
                return f"[Image file received: {len(response.content)} bytes, no text detected]"
        except ImportError:
            return f"[Image file received: {len(response.content)} bytes, install pillow and pytesseract for OCR]"
        except Exception as e:
            return f"[Image file received: {len(response.content)} bytes, OCR failed: {e}]"
        
    else:
        # For other types, return a message or raw bytes as needed
        return f"[Unhandled content type: {content_type}, {len(response.content)} bytes received]"
