from flask import Flask, request, jsonify
from flask_cors import CORS

import numpy as np
import cv2

from database import get_db_connection
from face_verify import verify_face

app = Flask(__name__)
CORS(app)


# -------------------------------------
# Home
# -------------------------------------

@app.route("/")
def home():
    return "Face Recognition Backend Running"


# -------------------------------------
# Student Profile API
# -------------------------------------

@app.route("/student/profile/<firebase_uid>", methods=["GET"])
def get_student_profile(firebase_uid):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                full_name,
                prn,
                email,
                phone,
                year,
                branch,
                division,
                gender,
                face_folder
            FROM students
            WHERE firebase_uid = %s
        """, (firebase_uid,))

        student = cursor.fetchone()

        cursor.close()
        conn.close()

        if student:
            return jsonify(student)

        return jsonify({
            "message": "Student not found"
        }), 404

    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500


# -------------------------------------
# Face Verification API
# -------------------------------------

@app.route("/verify-face", methods=["POST"])
def verify():

    if "image" not in request.files:
        return jsonify({
            "verified": False,
            "message": "No image uploaded"
        }), 400

    firebase_uid = request.form.get("uid")

    if not firebase_uid:
        return jsonify({
            "verified": False,
            "message": "UID not received"
        }), 400

    file = request.files["image"]

    image = np.frombuffer(file.read(), np.uint8)
    image = cv2.imdecode(image, cv2.IMREAD_COLOR)

    result = verify_face(image, firebase_uid)

    return jsonify(result)


# -------------------------------------

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )