import cv2
import pickle
import numpy as np
import face_recognition

from liveness import check_liveness
from database import get_db_connection


# ============================================================
# LOAD FACE ENCODINGS
# ============================================================

with open("encodings.pickle", "rb") as f:
    data = pickle.load(f)


# ============================================================
# VERIFY FACE
# ============================================================

def verify_face(image, prn, session_id):

    # ========================================================
    # VALIDATE PRN
    # ========================================================

    if not prn:
        return {
            "verified": False,
            "message": "PRN is required."
        }

    prn = str(prn).strip()


    # ========================================================
    # VALIDATE SESSION
    # ========================================================

    if not session_id:
        return {
            "verified": False,
            "message": "Session ID is required."
        }


    session_id = str(
        session_id
    ).strip()


    # ========================================================
    # LIVENESS CHECK
    # ========================================================

    try:

        is_live = check_liveness(image)

    except Exception as e:

        print(
            "LIVENESS ERROR:",
            str(e)
        )

        return {
            "verified": False,
            "message": "Liveness verification failed."
        }


    if not is_live:

        return {
            "verified": False,
            "message": "Spoof Detected"
        }


    # ========================================================
    # CONVERT BGR → RGB
    # ========================================================

    try:

        rgb = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2RGB
        )

    except Exception as e:

        print(
            "IMAGE CONVERSION ERROR:",
            str(e)
        )

        return {
            "verified": False,
            "message": "Invalid image."
        }


    # ========================================================
    # FIND FACES
    # ========================================================

    try:

        boxes = face_recognition.face_locations(
            rgb
        )

    except Exception as e:

        print(
            "FACE LOCATION ERROR:",
            str(e)
        )

        return {
            "verified": False,
            "message": "Unable to detect face."
        }


    if len(boxes) == 0:

        return {
            "verified": False,
            "message": "No face detected."
        }


    # ========================================================
    # TOO MANY FACES
    # ========================================================

    if len(boxes) > 1:

        return {
            "verified": False,
            "message": "Multiple faces detected. Only one student is allowed."
        }


    # ========================================================
    # GET STUDENT FROM MYSQL USING PRN
    # ========================================================

    conn = None
    cursor = None

    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                prn,
                full_name
            FROM students
            WHERE prn = %s
            LIMIT 1
            """,
            (prn,)
        )


        student = cursor.fetchone()


    except Exception as e:

        print(
            "DATABASE ERROR:",
            str(e)
        )

        return {
            "verified": False,
            "message": "Database error while finding student."
        }

    finally:

        if cursor:
            cursor.close()

        if conn:
            conn.close()


    # ========================================================
    # STUDENT NOT FOUND
    # ========================================================

    if not student:

        return {
            "verified": False,
            "message": "Student not found."
        }


    expected_prn = str(
        student["prn"]
    ).strip()


    # ========================================================
    # GENERATE FACE ENCODING
    # ========================================================

    try:

        encodings = face_recognition.face_encodings(
            rgb,
            boxes
        )

    except Exception as e:

        print(
            "FACE ENCODING ERROR:",
            str(e)
        )

        return {
            "verified": False,
            "message": "Unable to process face."
        }


    if len(encodings) == 0:

        return {
            "verified": False,
            "message": "Could not encode face."
        }


    # ========================================================
    # CHECK ENCODINGS FILE
    # ========================================================

    if "encodings" not in data:

        return {
            "verified": False,
            "message": "Face encoding database is invalid."
        }


    if "names" not in data:

        return {
            "verified": False,
            "message": "Face name database is invalid."
        }


    if len(data["encodings"]) == 0:

        return {
            "verified": False,
            "message": "No registered face encodings found."
        }


    # ========================================================
    # COMPARE FACE
    # ========================================================

    for encoding in encodings:

        try:

            matches = face_recognition.compare_faces(
                data["encodings"],
                encoding
            )


            face_distances = face_recognition.face_distance(
                data["encodings"],
                encoding
            )

        except Exception as e:

            print(
                "FACE COMPARISON ERROR:",
                str(e)
            )

            return {
                "verified": False,
                "message": "Face comparison failed."
            }


        if len(face_distances) == 0:
            continue


        # ====================================================
        # BEST MATCH
        # ====================================================

        best_match = np.argmin(
            face_distances
        )


        best_distance = face_distances[
            best_match
        ]


        print(
            "PRN received:",
            expected_prn
        )

        print(
            "Recognized:",
            data["names"][best_match]
        )

        print(
            "Face distance:",
            best_distance
        )


        # ====================================================
        # FACE MATCH FOUND
        # ====================================================

        if matches[best_match]:

            recognized_prn = str(
                data["names"][best_match]
            ).strip()


            # =================================================
            # VERIFY FACE BELONGS TO SAME PRN
            # =================================================

            if recognized_prn == expected_prn:

                return {

                    "verified": True,

                    "prn":
                        expected_prn,

                    "name":
                        student["full_name"]

                }


            # =================================================
            # FACE BELONGS TO DIFFERENT STUDENT
            # =================================================

            return {

                "verified": False,

                "message":
                    "Face belongs to another student."

            }


    # ========================================================
    # FACE NOT RECOGNIZED
    # ========================================================

    return {

        "verified": False,

        "message":
            "Face not recognized."

    }