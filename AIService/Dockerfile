# AIService/Dockerfile

# Use an official AWS Lambda Python base image for your desired Python version
# This image is optimized for Lambda's CPU environment.
FROM public.ecr.aws/lambda/python:3.11-x86_64

# Set the working directory in the container
WORKDIR /var/task

# Copy requirements file and install dependencies
# Using --no-cache-dir helps keep image size down
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your application code
# The dot '.' refers to the current build context (your AIService/ directory)
COPY . .

# Set the Lambda handler.
# This defines the function that Lambda will invoke.
# It points to 'lambda_handler' function within your 'main.py' file.
CMD ["main.lambda_handler"]