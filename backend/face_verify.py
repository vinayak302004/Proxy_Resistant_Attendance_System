import cv2
import pickle
import numpy as np
import face_recognition

# Load encodings once
with open("encodings.pickle", "rb") as f:
    data = pickle.load(f)


def verify_face(image):

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    boxes = face_recognition.face_locations(rgb)

    if len(boxes) == 0:
        return {
            "verified": False,
            "message": "No face detected"
        }

    encodings = face_recognition.face_encodings(rgb, boxes)

    for encoding in encodings:

        matches = face_recognition.compare_faces(
            data["encodings"],
            encoding
        )

        face_distances = face_recognition.face_distance(
            data["encodings"],
            encoding
        )

        if len(face_distances) == 0:
            continue

        best_match = np.argmin(face_distances)

        if matches[best_match]:

            return {
                "verified": True,
                "name": data["names"][best_match]
            }

    return {
        "verified": False,
        "message": "Face not recognized"
    }