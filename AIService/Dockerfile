# Start with an official Python image. 3.10 is a stable choice.
FROM python:3.10-slim

# Install system dependencies needed for PyMuPDF and other packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy only the requirements file first to leverage Docker's layer caching
COPY requirements.txt ./

# Install Python dependencies from your requirements.txt
# --no-cache-dir keeps the image smaller
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code into the container
COPY . .

# Expose the port your AIService runs on (assuming 8000)
EXPOSE 8000

# Define the command to run your app in production
# This assumes your app instance is named `app` in your `main.py` file.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]