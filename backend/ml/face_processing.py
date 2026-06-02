import cv2
import numpy as np
import os
from backend.core.config import settings

# Paths to models
detector_model = os.path.join(settings.BASE_DIR, 'backend', 'ml', 'models', 'face_detection_yunet.onnx')
recognizer_model = os.path.join(settings.BASE_DIR, 'backend', 'ml', 'models', 'face_recognition_sface.onnx')

# Global caches to avoid reloading ONNX models on every frame (massively improves speed)
_cached_detector = None
_cached_detector_size = None
_cached_recognizer = None
_cached_student_features = None

def get_cached_student_features(db):
    global _cached_student_features
    if _cached_student_features is None:
        from backend.db import models
        import json
        all_encodings = db.query(models.FaceEncoding).all()
        db_features = {}
        for enc in all_encodings:
            if enc.student_id not in db_features:
                db_features[enc.student_id] = []
            try:
                db_features[enc.student_id].append(np.array(json.loads(enc.encoding_data), dtype=np.float32))
            except Exception:
                pass
        _cached_student_features = db_features
    return _cached_student_features

def invalidate_student_features_cache():
    global _cached_student_features
    _cached_student_features = None

def get_face_detector(input_size=(320, 320)):
    global _cached_detector, _cached_detector_size
    if _cached_detector is None:
        if not os.path.exists(detector_model):
            raise FileNotFoundError(f"Detector model not found at {detector_model}")
        _cached_detector = cv2.FaceDetectorYN.create(
            model=detector_model,
            config="",
            input_size=input_size,
            score_threshold=0.9,
            nms_threshold=0.3,
            top_k=5000
        )
        _cached_detector_size = input_size
    elif _cached_detector_size != input_size:
        try:
            _cached_detector.setInputSize(input_size)
            _cached_detector_size = input_size
        except Exception:
            # Fallback if setInputSize fails on certain OpenCV versions
            _cached_detector = cv2.FaceDetectorYN.create(
                model=detector_model,
                config="",
                input_size=input_size,
                score_threshold=0.9,
                nms_threshold=0.3,
                top_k=5000
            )
            _cached_detector_size = input_size
            
    return _cached_detector

def get_face_recognizer():
    global _cached_recognizer
    if _cached_recognizer is None:
        if not os.path.exists(recognizer_model):
            raise FileNotFoundError(f"Recognizer model not found at {recognizer_model}")
        _cached_recognizer = cv2.FaceRecognizerSF.create(
            model=recognizer_model,
            config=""
        )
    return _cached_recognizer

def calculate_face_quality(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Blur score
    fm = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_score = min(100.0, max(0.0, fm / 5.0)) # Maps variance of 500 to 100%
    
    # Brightness score
    mean_val = cv2.mean(gray)[0]
    brightness_score = max(0.0, 100.0 - abs(mean_val - 127.0) / 127.0 * 100.0)
    
    # Combined score
    quality_score = (blur_score * 0.7) + (brightness_score * 0.3)
    return quality_score

def analyze_face_liveness_and_quality(image):
    """
    Analyzes the face for:
    - Quality (blur, brightness, visibility, multiple faces)
    - Liveness (blink detection, head pose estimation)
    - Anti-spoofing indicators (texture variance, multi-frame check parameters)
    Returns:
    {
       "face_detected": bool,
       "error": str or None,
       "quality_score": float,
       "blur_score": float,
       "brightness_score": float,
       "status": "Good" / "Poor",
       "liveness": {
          "head_pose": "front" / "left" / "right",
          "eyes_closed": bool
       },
       "feature": numpy array (128-d) or None
    }
    """
    res = {
        "face_detected": False,
        "error": None,
        "quality_score": 0.0,
        "blur_score": 0.0,
        "brightness_score": 0.0,
        "status": "Poor",
        "liveness": {
            "head_pose": "front",
            "eyes_closed": False
        },
        "feature": None
    }
    try:
        # Resize frame to 640x480 if it's larger
        h, w = image.shape[:2]
        if w > 640 or h > 480:
            image = cv2.resize(image, (640, 480))
            h, w = 480, 640

        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # 1. Blur evaluation
        fm = cv2.Laplacian(gray, cv2.CV_64F).var()
        blur_score = min(100.0, max(0.0, fm / 5.0)) # Maps variance of 500 to 100%

        # 2. Brightness evaluation
        mean_val = cv2.mean(gray)[0]
        brightness_score = max(0.0, 100.0 - abs(mean_val - 127.0) / 127.0 * 100.0)

        # 3. Overall quality score
        quality_score = (blur_score * 0.7) + (brightness_score * 0.3)
        res["blur_score"] = round(blur_score, 1)
        res["brightness_score"] = round(brightness_score, 1)
        res["quality_score"] = round(quality_score, 1)

        # Detect face
        detector = get_face_detector((w, h))
        recognizer = get_face_recognizer()
        faces = detector.detect(image)

        if faces[1] is None or len(faces[1]) == 0:
            res["error"] = "No face detected"
            return res

        if len(faces[1]) > 1:
            res["error"] = "Multiple faces detected"
            return res

        res["face_detected"] = True
        face = faces[1][0]

        # Check landmarks for head pose estimation
        # landmarks: left eye (4,5), right eye (6,7), nose (8,9)
        lex, ley = face[4], face[5]
        rex, rey = face[6], face[7]
        nox, noy = face[8], face[9]

        eye_dist = rex - lex
        if eye_dist > 0:
            ratio = float((nox - lex) / eye_dist)
            res["liveness"]["pose_ratio"] = ratio
            if ratio < 0.35:
                res["liveness"]["head_pose"] = "left"
            elif ratio > 0.65:
                res["liveness"]["head_pose"] = "right"
            else:
                res["liveness"]["head_pose"] = "front"
        else:
            res["liveness"]["pose_ratio"] = 0.5

        # Eye Closed/Blink Detection: Crop region around eye centers
        eyes_closed = False
        eye_details = []
        try:
            # We crop a small box around left and right eye centers
            for ex, ey in [(lex, ley), (rex, rey)]:
                x1, y1 = max(0, int(ex) - 8), max(0, int(ey) - 8)
                x2, y2 = min(w, int(ex) + 8), min(h, int(ey) + 8)
                if x2 > x1 and y2 > y1:
                    eye_crop = gray[y1:y2, x1:x2]
                    std = float(np.std(eye_crop))
                    canny = cv2.Canny(eye_crop, 30, 100)
                    density = float(np.sum(canny > 0) / canny.size)
                    eye_details.append({"std": std, "density": density})
                    if std < 14.0 or density < 0.04:
                        eyes_closed = True
        except Exception:
            pass

        res["liveness"]["eyes_closed"] = eyes_closed
        res["liveness"]["eye_details"] = eye_details

        if fm < 80.0:
            res["status"] = "Poor"
            res["error"] = "Image too blurry. Hold steady."
            return res
        if mean_val < 45.0 or mean_val > 230.0:
            res["status"] = "Poor"
            res["error"] = "Poor lighting. Check brightness."
            return res

        res["status"] = "Good"

        # Align and extract embedding
        aligned_face = recognizer.alignCrop(image, face)
        feature = recognizer.feature(aligned_face)
        res["feature"] = feature[0]

    except Exception as e:
        res["error"] = f"Processing error: {str(e)}"
    
    return res

def extract_face_feature(image):
    """
    Detects a single face in the image and extracts its 128-d feature vector.
    Returns (feature_vector, quality_score, error_message)
    """
    try:
        quality_score = calculate_face_quality(image)
        
        height, width, _ = image.shape
        detector = get_face_detector((width, height))
        recognizer = get_face_recognizer()
        
        # Detect faces
        faces = detector.detect(image)
        if faces[1] is None:
            return None, quality_score, "No face detected"
            
        if len(faces[1]) > 1:
            return None, quality_score, "Multiple faces detected. Please ensure only one face is in the frame."
            
        # Align face and extract feature
        face = faces[1][0]
        aligned_face = recognizer.alignCrop(image, face)
        feature = recognizer.feature(aligned_face)
        return feature[0], quality_score, None
    except Exception as e:
        return None, 0.0, str(e)

def extract_multiple_face_features(image):
    """
    Detects multiple faces in the image and extracts their features.
    Returns (list_of_features, error_message)
    """
    try:
        height, width, _ = image.shape
        detector = get_face_detector((width, height))
        recognizer = get_face_recognizer()
        
        faces = detector.detect(image)
        if faces[1] is None:
            return [], "No faces detected"
            
        features = []
        for face in faces[1]:
            aligned_face = recognizer.alignCrop(image, face)
            feature = recognizer.feature(aligned_face)
            features.append(feature[0])
            
        return features, None
    except Exception as e:
        return [], str(e)


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
