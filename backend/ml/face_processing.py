import cv2
import numpy as np
import os
from backend.core.config import settings

# Paths to models
detector_model = os.path.join(settings.BASE_DIR, 'backend', 'ml', 'models', 'face_detection_yunet.onnx')
recognizer_model = os.path.join(settings.BASE_DIR, 'backend', 'ml', 'models', 'face_recognition_sface.onnx')

# Initialize models if they exist (they are downloaded asynchronously)
def get_face_detector(input_size=(320, 320)):
    if not os.path.exists(detector_model):
        raise FileNotFoundError(f"Detector model not found at {detector_model}")
    detector = cv2.FaceDetectorYN.create(
        model=detector_model,
        config="",
        input_size=input_size,
        score_threshold=0.9,
        nms_threshold=0.3,
        top_k=5000
    )
    return detector

def get_face_recognizer():
    if not os.path.exists(recognizer_model):
        raise FileNotFoundError(f"Recognizer model not found at {recognizer_model}")
    recognizer = cv2.FaceRecognizerSF.create(
        model=recognizer_model,
        config=""
    )
    return recognizer

def check_blur(image, threshold=100.0):
    """Returns True if image is blurry (variance of Laplacian < threshold)"""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    fm = cv2.Laplacian(gray, cv2.CV_64F).var()
    return fm < threshold

def extract_face_feature(image):
    """
    Detects a single face in the image and extracts its 128-d feature vector.
    Returns (feature_vector, error_message)
    """
    try:
        height, width, _ = image.shape
        detector = get_face_detector((width, height))
        recognizer = get_face_recognizer()
        
        # Detect faces
        faces = detector.detect(image)
        if faces[1] is None:
            return None, "No face detected"
            
        if len(faces[1]) > 1:
            return None, "Multiple faces detected. Please ensure only one face is in the frame."
            
        # Align face and extract feature
        face = faces[1][0]
        aligned_face = recognizer.alignCrop(image, face)
        feature = recognizer.feature(aligned_face)
        return feature[0], None
    except Exception as e:
        return None, str(e)

def match_face(feature1, feature2, threshold=0.363): # cosine distance threshold for SFace
    """
    Compares two face features.
    Returns True if match, else False.
    """
    recognizer = get_face_recognizer()
    score = recognizer.match(feature1, feature2, cv2.FaceRecognizerSF_FR_COSINE)
    # For cosine distance in SFace, higher is more similar. Threshold is around 0.363
    return score >= threshold

def find_best_match(target_feature, db_features, threshold=0.363):
    """
    Finds the best matching feature in a dictionary of {student_id: list_of_features}
    Returns (student_id, confidence) or (None, 0.0)
    """
    best_match_id = None
    best_score = 0.0
    
    recognizer = get_face_recognizer()
    
    for student_id, features in db_features.items():
        for db_feat in features:
            score = recognizer.match(target_feature, db_feat, cv2.FaceRecognizerSF_FR_COSINE)
            if score > best_score and score >= threshold:
                best_score = score
                best_match_id = student_id
                
    return best_match_id, best_score
