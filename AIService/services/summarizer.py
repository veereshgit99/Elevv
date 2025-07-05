# AIService/services/summarizer.py
from transformers import pipeline, AutoTokenizer # <--- Already added AutoTokenizer
import logging
import os # Ensure os is imported if still setting env vars here (for local testing)

logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# Load the tokenizer separately
model_name = "facebook/bart-large-cnn"

# Initialize pipeline as before (it will load the model)
summarizer_pipeline = pipeline("summarization", model=model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name) # <--- LOAD TOKENIZER

# Use the tokenizer's model_max_length for input tokens
# BART's typical max input length is 1024 tokens.
MODEL_MAX_INPUT_TOKENS = tokenizer.model_max_length
if MODEL_MAX_INPUT_TOKENS is None or MODEL_MAX_INPUT_TOKENS > 1024:
    MODEL_MAX_INPUT_TOKENS = 1024

MAX_SUMMARY_LEN = 150 # This controls the OUTPUT summary length
MIN_SUMMARY_LEN = 40

def generate_summary(text: str) -> str:
    print(text)
    try:
        logger.info(f"Received text for summarization. Length: {len(text)} characters.")

        # 1. Explicitly tokenize and truncate input text
        # This creates the input_ids and attention_mask tensors needed by the model
        inputs = tokenizer(
            text,
            max_length=MODEL_MAX_INPUT_TOKENS, # Truncate input to model's max
            truncation=True,                   # Explicitly enable truncation
            return_tensors="pt"                # Return PyTorch tensors
        )
        logger.info(f"Input text tokenized and truncated to max_length: {MODEL_MAX_INPUT_TOKENS}. Token IDs shape: {inputs['input_ids'].shape}")

        # 2. Directly call the model's generate method
        # Access the underlying model from the pipeline and call generate()
        output_ids = summarizer_pipeline.model.generate(
            input_ids=inputs["input_ids"],          # Pass the input_ids tensor
            attention_mask=inputs["attention_mask"], # Pass the attention_mask tensor
            max_length=MAX_SUMMARY_LEN,             # Control output summary length
            min_length=MIN_SUMMARY_LEN,             # Control output summary min length
            do_sample=False,
            num_beams=4,                            # Add num_beams for better quality summaries (common for BART)
            early_stopping=True                     # Stop generation when EOS token is generated
        )

        # 3. Decode the generated token IDs back to text
        summary_text = tokenizer.decode(output_ids[0], skip_special_tokens=True)
        logger.info(f"Summary generated. Length: {len(summary_text)} characters.")

        return summary_text

    except Exception as e:
        logger.error(f"Summarization failed: {e}", exc_info=True)
        return "[Summary generation failed]"