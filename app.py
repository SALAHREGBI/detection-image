import os
import base64
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from google import genai
from google.genai import types

# Load environment variables (try .env first, then .env.local, then ../.env.local)
load_dotenv()
if not os.getenv("API_KEY"):
    load_dotenv('.env.local')
if not os.getenv("API_KEY"):
    load_dotenv(os.path.join(os.path.dirname(__file__), '.env.local'))

app = Flask(__name__)

# Initialize Gemini Client
def get_gemini_client():
    api_key = os.getenv("API_KEY")
    if not api_key:
        raise ValueError("API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    try:
        data = request.get_json()
        if not data or 'base64' not in data or 'mimeType' not in data:
            return jsonify({'error': 'Invalid request data. Expected base64 and mimeType.'}), 400

        base64_image = data['base64']
        mime_type = data['mimeType']
        
        # Decode base64 image
        try:
            image_bytes = base64.b64decode(base64_image)
        except Exception as e:
            return jsonify({'error': f'Invalid base64 string: {str(e)}'}), 400

        client = get_gemini_client()

        # Call Gemini API
        # Replicating logic: model='gemini-2.5-flash', tools=[{googleSearch: {}}]
        # Python SDK uses pythonic names, e.g. google_search
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[
                types.Content(
                    parts=[
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                        types.Part.from_text(text="Describe this image in detail. Then, find websites that contain similar images.")
                    ]
                )
            ],
            config=types.GenerateContentConfig(
                tools=[types.Tool(google_search=types.GoogleSearch())]
            )
        )

        description = response.text
        
        # Extract grounding metadata (similar images)
        # Structure in Node: response.candidates[0].groundingMetadata.groundingChunks
        # Python SDK should be similar
        
        similar_images = []
        if response.candidates and response.candidates[0].grounding_metadata:
             # Depending on SDK version, it might be grounding_chunks or groundingChunks (usually snake_case in Python)
             chunks = response.candidates[0].grounding_metadata.grounding_chunks
             if chunks:
                 for chunk in chunks:
                     if chunk.web:
                         similar_images.append({
                             'web': {
                                 'uri': chunk.web.uri,
                                 'title': chunk.web.title
                             }
                         })

        if not description:
            return jsonify({'error': 'Failed to generate a description for the image.'}), 500

        result = {
            'description': description,
            'similarImages': similar_images
        }

        return jsonify(result)

    except Exception as e:
        print(f"Error analyzing image: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
