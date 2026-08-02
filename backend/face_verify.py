import cv2
import pickle
import numpy as np
import face_recognition
from liveness import check_liveness

from database import get_db_connection

# Load encodings once
with open("encodings.pickle", "rb") as f:
    data = pickle.load(f)


def verify_face(image, firebase_uid, session_id):

    is_live = check_liveness(image)

    if not is_live:
        return {
            "verified": False,
            "message": "Spoof Detected"
        }

    rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    boxes = face_recognition.face_locations(rgb)

    if len(boxes) == 0:
        return {
            "verified": False,
            "message": "No face detected"
        }

    # Get expected PRN from database
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute(
        "SELECT prn FROM students WHERE firebase_uid = %s",
        (firebase_uid,)
    )

    student = cursor.fetchone()

    cursor.close()
    conn.close()

    if not student:
        return {
            "verified": False,
            "message": "Student not found"
        }

    expected_prn = student["prn"]

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

            recognized_prn = data["names"][best_match]

            if recognized_prn == expected_prn:

                from attendance_session import get_session

                session = get_session()

                return {
                    "verified": True,
                    "name": recognized_prn,
                    "teacher_uid": session["teacher_uid"],
                    "department": session["department"],
                    "year": session["year"],
                    "subject": session["subject"]
                }

            return {
                "verified": False,
                "message": "Face belongs to another student"
            }

    return {
        "verified": False,
        "message": "Face not recognized"
    }