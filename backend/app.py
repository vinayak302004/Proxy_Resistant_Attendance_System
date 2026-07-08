from flask import Flask, request, jsonify
from flask_cors import CORS
from database import get_db_connection

import numpy as np
import cv2

from face_verify import verify_face

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "Face Recognition Backend Running"


@app.route("/verify-face", methods=["POST"])
def verify():

    if "image" not in request.files:
        return jsonify({
            "verified": False,
            "message": "No image uploaded"
        })

    file = request.files["image"]

    image = np.frombuffer(file.read(), np.uint8)

    image = cv2.imdecode(image, cv2.IMREAD_COLOR)

    result = verify_face(image)

    return jsonify(result)

@app.route("/student/profile/<firebase_uid>", methods=["GET"])
def get_student_profile(firebase_uid):

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        query = """
        SELECT
            full_name,
            prn,
            email,
            year,
            branch,
            division,
            face_folder
        FROM students
        WHERE firebase_uid = %s
        """

        cursor.execute(query, (firebase_uid,))
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

if __name__ == "__main__":
    app.run(
    host="0.0.0.0",
    port=5000,
    debug=True
    )