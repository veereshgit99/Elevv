# AIService/Dockerfile

# Use an official AWS Lambda Python base image for your desired Python version
FROM public.ecr.aws/lambda/python:3.11-x86_64

# Set the working directory in the container
WORKDIR /var/task

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Add after pip install
RUN python -m spacy download en_core_web_sm || echo "SpaCy model download skipped"

# --- PRE-DOWNLOAD HUGGING FACE MODEL (IMPLEMENT THIS NOW) ---
# Create a dedicated directory for the Hugging Face cache within the image
ENV HF_HOME = /usr/local/huggingface_cache # Set cache directory within the image
RUN mkdir -p ${HF_HOME}
# Set TMPDIR for temporary files during the build, if needed by download tools
ENV TMPDIR = /tmp
# Use Python to download the model files directly into the specified cache directory
RUN python -c "from transformers import pipeline; pipeline('summarization', model='facebook/bart-large-cnn')"
# --- END PRE-DOWNLOAD ---

# --- Configure Runtime Environment Variables ---
# These are for the running Lambda, not just during build
ENV TMPDIR = /tmp # Still essential for other temporary files at runtime
# Point HF_HOME to /tmp for runtime even though model is pre-downloaded,
# in case other cache operations happen. Model will be loaded from the pre-downloaded path.
ENV HF_HOME = /tmp
ENV HUGGINGFACE_HUB_CACHE = /tmp

# Copy your application code
COPY . .

# Set the Lambda handler.
CMD ["main.lambda_handler"]