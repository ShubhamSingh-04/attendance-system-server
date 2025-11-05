import os
import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
from insightface.app import FaceAnalysis

# --- Configuration ---
RECOGNITION_THRESHOLD = 0.4
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STUDENT_PICS_DIR = os.path.join(BASE_DIR, "..", "uploads", "student_pics")
CLASS_PICS_DIR = os.path.join(BASE_DIR, "..", "uploads", "class_pics")

# --- Pydantic Models (for Request/Response) ---
# This defines the structure of the JSON body for the POST request
class KnownStudent(BaseModel):
    usn: str
    faceEmbedding: List[float]

# --- Initialize FastAPI & InsightFace ---

# 1. Create a FastAPI instance
app = FastAPI(title="Face Recognition ML Service")

# 2. Initialize InsightFace (This runs once on server startup)
# We name this 'face_app' to avoid conflict with the FastAPI 'app'
try:
    face_app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    face_app.prepare(ctx_id=-1)
except Exception as e:
    # If this fails, the server can't provide ML services.
    print(f"FATAL ERROR: Failed to load insightface model: {e}")
    face_app = None

# --- Helper Function: Generate Embedding ---
# This is your logic from generate_embedding.py, turned into a reusable function

def _generate_embedding_from_image(image_path: str) -> List[float]:
    """
    Loads an image, finds a single face, and returns its
    normalized embedding as a list. Raises an Exception on failure.
    """
    img = cv2.imread(image_path)
    if img is None:
        raise Exception(f"Failed to load image from: {image_path}")

    faces = face_app.get(img)
    
    if len(faces) == 0:
        raise Exception("No faces found in the image.")
    if len(faces) > 1:
        raise Exception(f"Expected 1 face for registration, but found {len(faces)}.")
    
    embedding = faces[0].embedding
    
    # Normalize the embedding (crucial for accurate comparison)
    normalized_embedding = embedding / np.linalg.norm(embedding)
    
    return normalized_embedding.tolist()

# --- Helper Function: Compare Faces ---
# This is your logic from recognize_class.py

def _compare_face(new_embedding, known_embeddings_list):
    """
    Compares a new face embedding against a list of known, normalized embeddings.
    
    Args:
        new_embedding (np.array): The non-normalized embedding from a detected face.
        known_embeddings_list (list): A list of tuples: [(usn, normalized_known_embedding), ...]
        
    Returns:
        str: The USN of the best match, or None.
    """
    # 1. Normalize the new embedding
    new_emb_norm = new_embedding / np.linalg.norm(new_embedding)
    
    best_match_usn = None
    best_score = -1  # Cosine similarity ranges from -1 to 1

    for usn, known_emb_norm in known_embeddings_list:
        # 2. Calculate cosine similarity (dot product of two normalized vectors)
        score = np.dot(new_emb_norm, known_emb_norm)
        
        # 3. Find the highest score
        if score > best_score:
            best_score = score
            best_match_usn = usn
    
    # 4. Return the USN only if the best match is good enough
    if best_score >= RECOGNITION_THRESHOLD:
        return best_match_usn
    else:
        return None # This face is unrecognized

# --- API Endpoint 1: Generate Embedding ---

@app.get("/generate-embedding/")
def api_generate_embedding(student_id: str, image_name: str):
    """
    Generates a face embedding for a single student's registration photo.
    Looks for the image in ../uploads/student_pics/
    """
    if face_app is None:
        raise HTTPException(status_code=500, detail="Insightface model is not loaded.")
    
    try:
        # Construct the full image path
        image_path = os.path.join(STUDENT_PICS_DIR, image_name)
        
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail=f"Image file not found: {image_path}")

        # Call the helper function
        embedding_list = _generate_embedding_from_image(image_path)
        
        # Return the successful JSON response
        return {
            "usn": student_id,
            "faceEmbedding": embedding_list
        }
    
    except Exception as e:
        # If anything fails, return a 400 error with the message
        raise HTTPException(status_code=400, detail=str(e))

# --- API Endpoint 2: Recognize Students ---

@app.post("/recognize-students/{image_name}")
def api_recognize_students(image_name: str, known_students_data: List[KnownStudent]):
    """
    Recognizes all known students present in a single class photo.
    Looks for the image in ../uploads/class_pics/
    Receives a JSON array of student data in the request body.
    """
    if face_app is None:
        raise HTTPException(status_code=500, detail="Insightface model is not loaded.")

    try:
        image_path = os.path.join(CLASS_PICS_DIR, image_name)
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail=f"Image file not found: {image_path}")

        # 1. Load the class photo
        img = cv2.imread(image_path)
        if img is None:
            raise Exception(f"Failed to load image from: {image_path}")

        # 2. Prepare the known embeddings list
        known_embeddings_list = []
        for student in known_students_data:
            # Convert embedding from list back to a numpy array
            embedding = np.array(student.faceEmbedding)
            known_embeddings_list.append((student.usn, embedding))
            
        if not known_embeddings_list:
            raise Exception("No valid student embedding data was received.")

        # 3. Detect all faces in the class photo
        faces = face_app.get(img)
        
        # 4. Initialize results
        faces_detected = len(faces)
        unrecognized_count = 0
        recognized_usns_set = set()

        # 5. Loop through each face found in the photo
        for face in faces:
            new_embedding = face.embedding # This is NOT normalized
            
            matched_usn = _compare_face(new_embedding, known_embeddings_list)
            
            if matched_usn:
                recognized_usns_set.add(matched_usn)
            else:
                unrecognized_count += 1
                
        # 6. Format the final output
        results = {
            "faces_detected": faces_detected,
            "unrecognized_faces": unrecognized_count,
            "recognized_usns": list(recognized_usns_set)
        }
        
        return results

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))