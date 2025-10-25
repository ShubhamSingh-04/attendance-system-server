import cv2
import numpy as np
from insightface.app import FaceAnalysis
import json
import sys

# --- Initialize InsightFace ---
# This part is relatively slow, so it runs once when the script starts.
# Any errors here will be printed to stderr.
try:
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=-1)
except Exception as e:
    # Print error as JSON to stderr and exit
    print(json.dumps({"error": f"Failed to load insightface model: {e}"}), file=sys.stderr)
    sys.exit(1)

def generate_embedding_from_image(image_path):
    """
    Loads an image, finds a single face, and returns its
    normalized embedding. Raises an Exception on failure.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise Exception(f"Failed to load image from: {image_path}")

    faces = app.get(img)
    
    if len(faces) == 0:
        raise Exception("No faces found in the image.")
    if len(faces) > 1:
        # You could change this if you want to register the "largest" face,
        # but for a registration photo, 1 face is the safest assumption.
        raise Exception(f"Expected 1 face for registration, but found {len(faces)}.")
    
    # Get the embedding from the first (and only) face
    embedding = faces[0].embedding
    
    # --- Normalize the embedding (crucial for accurate comparison) ---
    # This ensures all embedding vectors have a length of 1
    normalized_embedding = embedding / np.linalg.norm(embedding)
    
    return normalized_embedding

# --- Main script execution ---
if __name__ == "__main__":
    # This block runs when you execute:
    # python generate_embedding.py <usn> <image_path>
    
    if len(sys.argv) != 3:
        error_msg = f"Usage: python {sys.argv[0]} <usn> <image_path>"
        print(json.dumps({"error": error_msg}), file=sys.stderr)
        sys.exit(1)
        
    usn = sys.argv[1]
    image_path = sys.argv[2]
    
    try:
        # 1. Generate the embedding
        embedding = generate_embedding_from_image(image_path)
        
        # 2. Convert the NumPy array to a standard Python list for JSON
        embedding_list = embedding.tolist()
        
        # 3. Create the final result dictionary
        result = {
            "usn": usn,
            "faceEmbedding": embedding_list
        }
        
        # 4. Print the final JSON string to stdout
        # Your Node.js script will capture this output
        print(json.dumps(result))
        
    except Exception as e:
        # If anything in generate_embedding_from_image fails,
        # print the error as JSON to stderr
        print(json.dumps({"error": str(e), "usn": usn}), file=sys.stderr)
        sys.exit(1)
        
        
        
# embedding = generate_embedding_from_image(image_path)