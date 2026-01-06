#!/usr/bin/env python3
"""
Face Comparison Script for Taskly Backend
Compares two face images and returns match result
Uses DeepFace library with lightweight SFace model for speed
"""

import sys
import json
import argparse
import os
import warnings

# Suppress TensorFlow warnings
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
warnings.filterwarnings('ignore')

try:
    from deepface import DeepFace
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "DeepFace not installed. Run: pip install deepface",
        "match": False,
        "confidence": 0,
        "distance": 1.0
    }))
    sys.exit(1)


def compare_faces(image1_path, image2_path, threshold=0.6):
    """
    Compare two face images using DeepFace with SFace (fast model)
    """
    try:
        # Use SFace - much faster than VGG-Face, good accuracy
        result = DeepFace.verify(
            img1_path=image1_path,
            img2_path=image2_path,
            model_name="SFace",  # Fast and lightweight
            enforce_detection=True,
            detector_backend="opencv"  # Fast detector
        )
        
        distance = result.get("distance", 1.0)
        verified = result.get("verified", False)
        confidence = max(0, 1 - distance)
        
        return {
            "success": True,
            "match": verified,
            "confidence": float(confidence),
            "distance": float(distance),
            "threshold": result.get("threshold", threshold)
        }
        
    except Exception as e:
        error_msg = str(e)
        
        if "Face could not be detected" in error_msg or "No face detected" in error_msg:
            return {
                "success": False,
                "error": "No face detected in one or both images",
                "match": False,
                "confidence": 0,
                "distance": 1.0
            }
        
        return {
            "success": False,
            "error": error_msg,
            "match": False,
            "confidence": 0,
            "distance": 1.0
        }


def detect_face(image_path):
    """
    Detect if an image contains a face
    """
    try:
        faces = DeepFace.extract_faces(
            img_path=image_path,
            detector_backend="opencv",
            enforce_detection=False
        )
        
        num_faces = len(faces) if faces else 0
        
        return {
            "success": True,
            "face_detected": num_faces > 0,
            "num_faces": num_faces
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "face_detected": False,
            "num_faces": 0
        }


def main():
    parser = argparse.ArgumentParser(description='Face comparison and detection')
    parser.add_argument('image1', nargs='?', help='First image path (profile)')
    parser.add_argument('image2', nargs='?', help='Second image path (selfie)')
    parser.add_argument('--detect', help='Detect face in single image')
    parser.add_argument('--threshold', type=float, default=0.6, help='Matching threshold')
    
    args = parser.parse_args()
    
    if args.detect:
        result = detect_face(args.detect)
    elif args.image1 and args.image2:
        result = compare_faces(args.image1, args.image2, args.threshold)
    else:
        result = {
            "success": False,
            "error": "Invalid arguments. Use --help for usage information"
        }
    
    print(json.dumps(result))


if __name__ == "__main__":
    main()
