import sys
import json
import cv2
import numpy as np
from insightface.app import FaceAnalysis

# --- Configuration ---
# You can tune this threshold.
# 0.5 is a good starting point for a balance.
# Lower (e.g., 0.4) is less strict.
# Higher (e.g., 0.6) is more strict.
RECOGNITION_THRESHOLD = 0.4

# --- Initialize InsightFace ---
# This runs once when the script starts.
try:
    app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
    app.prepare(ctx_id=-1)
except Exception as e:
    print(json.dumps({"error": f"Failed to load insightface model: {e}"}), file=sys.stderr)
    sys.exit(1)

def compare_face(new_embedding, known_embeddings_list):
    """
    Compares a new face embedding against a list of known embeddings.
    
    Args:
        new_embedding (np.array): The embedding of the face found in the class photo.
        known_embeddings_list (list): A list of tuples: [(usn, known_embedding), ...]
        
    Returns:
        str: The USN of the best match, or None if no match is above the threshold.
    """
    # 1. Normalize the new embedding (all embeddings must be normalized for dot product)
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

def recognize_students_in_image(image_path, known_students_data):
    """
    Main function to process the class photo and identify students.
    """
    
    # 1. Load the class photo
    img = cv2.imread(image_path)
    if img is None:
        raise Exception(f"Failed to load image from: {image_path}")

    # 2. Prepare the known embeddings list
    # Convert the list-of-dicts from JSON into the format our compare function needs
    known_embeddings_list = []
    for student in known_students_data:
        try:
            # Convert embedding from a list back to a numpy array
            embedding = np.array(student["faceEmbedding"])
            usn = student["usn"]
            known_embeddings_list.append((usn, embedding))
        except KeyError:
            # Handle bad data from Node.js, if any
            pass 
            
    if not known_embeddings_list:
        raise Exception("No valid student embedding data was received.")

    # 3. Detect all faces in the class photo
    faces = app.get(img)
    
    # 4. Initialize results
    faces_detected = len(faces)
    unrecognized_count = 0
    # Use a set to automatically handle finding the same student multiple times
    recognized_usns_set = set()

    # 5. Loop through each face found in the photo
    for face in faces:
        new_embedding = face.embedding
        
        # Find the best match for this face
        matched_usn = compare_face(new_embedding, known_embeddings_list)
        
        if matched_usn:
            recognized_usns_set.add(matched_usn)
        else:
            unrecognized_count += 1
            
    # 6. Format the final output
    results = {
        "faces_detected": faces_detected,       # Requirement 2
        "unrecognized_faces": unrecognized_count, # Requirement 1
        "recognized_usns": list(recognized_usns_set) # Requirement 3
    }
    
    return results

# --- Main script execution ---
if __name__ == "__main__":
    # This block runs when you execute:
    # python recognize_class.py <image_path>
    # (and pipe student data into stdin)
    
    try:
        # 1. Get image path from command-line argument
        if len(sys.argv) != 2:
            raise Exception(f"Usage: python {sys.argv[0]} <image_path>")
        image_path = sys.argv[1]
        
        # 2. Read all student data from stdin
        stdin_data = sys.stdin.read()
        if not stdin_data:
            raise Exception("No student data received via stdin.")
            
        known_students_list = json.loads(stdin_data)
        
        # 3. Run the recognition
        final_report = recognize_students_in_image(image_path, known_students_list)
        
        # 4. Print the final JSON report to stdout
        # Node.js will capture this
        print(json.dumps(final_report))

    except Exception as e:
        # If anything fails, print a JSON error to stderr
        # Node.js will capture this on 'stderr'
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)