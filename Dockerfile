# Stage 1: Build the React frontend
FROM node:20 AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Setup Python backend and serve
FROM python:3.10-slim
WORKDIR /app

# Copy the Python requirements and install them
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the Python backend code
COPY server.py .

# Copy the built React app from the frontend-build stage into the 'dist' folder
COPY --from=frontend-build /app/dist /app/dist

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["python", "server.py"]
