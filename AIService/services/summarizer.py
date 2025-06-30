from transformers import pipeline
import logging

# Load on module init for efficiency
summarizer_pipeline = pipeline("summarization", model="facebook/bart-large-cnn")

MAX_INPUT_LEN = 1024  # tokens (about 800-1000 words)
MAX_SUMMARY_LEN = 150

def generate_summary(text: str) -> str:
    try:
        # Truncate input if too long (scale-safe)
        if len(text) > MAX_INPUT_LEN * 5:  # rough word-token scaling
            logging.warning("Text too long; truncating input.")
            text = text[:MAX_INPUT_LEN * 4]

        result = summarizer_pipeline(
            text,
            max_length=MAX_SUMMARY_LEN,
            min_length=40,
            do_sample=False
        )

        return result[0]['summary_text']

    except Exception as e:
        logging.error(f"Summarization failed: {e}")
        return "[Summary generation failed]"
