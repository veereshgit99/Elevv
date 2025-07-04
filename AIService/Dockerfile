# AIService/Dockerfile

# Use an official AWS Lambda Python base image for your desired Python version
FROM public.ecr.aws/lambda/python:3.11-x86_64

# Set the working directory in the container
WORKDIR /var/task

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# --- Ensure temporary directories are correctly configured ---
# This is crucial for runtime model download and other temporary files
RUN mkdir -p /tmp && chmod 777 /tmp
ENV TMPDIR=/tmp
ENV HF_HOME=/tmp
ENV HUGGINGFACE_HUB_CACHE=/tmp
# --- End of additions ---

# Copy your application code
COPY . .

# Set the Lambda handler.
CMD ["main.lambda_handler"]