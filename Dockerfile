FROM python:3.9-slim
WORKDIR /app
COPY . .
# Install Gemini SDK s7i7a
RUN pip install --no-cache-dir flask google-genai python-dotenv Pillow
EXPOSE 5000
# Lancer app.py hit hwa l-fichi dialk
CMD ["python", "app.py"]