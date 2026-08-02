import os
import sys
from pathlib import Path

# -----------------------------
# Add anti-spoof repository to Python path
# -----------------------------
ROOT_DIR = Path(__file__).resolve().parent.parent
ANTI_SPOOF_DIR = ROOT_DIR / "face-antispoof-onnx-main"

sys.path.append(str(ANTI_SPOOF_DIR))

# -----------------------------
# Import anti-spoof modules
# -----------------------------
from src.detection import load_detector, detect
from src.inference import (
    load_model,
    infer,
    process_with_logits,
    crop
)

import cv2
import numpy as np

# -----------------------------
# Model Paths
# -----------------------------
MODELS_DIR = ANTI_SPOOF_DIR / "models"

DETECTOR_MODEL = MODELS_DIR / "detector_quantized.onnx"
LIVENESS_MODEL = MODELS_DIR / "best_model_quantized.onnx"

# -----------------------------
# Load Models Once
# -----------------------------
face_detector = load_detector(
    str(DETECTOR_MODEL),
    (320, 320)
)

liveness_session, input_name = load_model(
    str(LIVENESS_MODEL)
)

def check_liveness(image):
    """
    Returns:
        True  -> Live face
        False -> Spoof / No Face
    """

    if image is None:
        return False

    # Detect faces
    faces = detect(image, face_detector)

    if len(faces) == 0:
        print("No face detected")
        return False

    # Crop all detected faces
    face_crops = []

    for face in faces:


        bbox = face["bbox"]

        x = int(bbox["x"])
        y = int(bbox["y"])
        w = int(bbox["width"])
        h = int(bbox["height"])

        crop_img = crop(
            image,
            (x, y, x + w, y + h),
            bbox_expansion_factor=1.5
        )

        if crop_img is not None:
            face_crops.append(crop_img)

    if len(face_crops) == 0:
        return False

    # Run ONNX inference
    predictions = infer(
        face_crops,
        liveness_session,
        input_name,
        128
    )

    if len(predictions) == 0:
        return False

    # Use first detected face
    result = process_with_logits(
        predictions[0],
        threshold=0.0
    )

    print(result)

    return result["is_real"]