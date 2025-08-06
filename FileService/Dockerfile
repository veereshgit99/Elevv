# Start with an official Python image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies, including Node.js and npm
RUN apt-get update && apt-get install -y nodejs npm

# --- Install Node.js dependencies first ---
# Copy only the package files to leverage Docker caching
COPY package*.json ./
# Install Node.js dependencies from your package.json
RUN npm install

# --- Install Python dependencies ---
# Copy the requirements file
COPY requirements.txt ./
# Install Python dependencies from your requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# --- Copy the rest of your application code ---
COPY . .

# Expose the port your Uvicorn server runs on
EXPOSE 8001

# Define the command to run your app in production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]