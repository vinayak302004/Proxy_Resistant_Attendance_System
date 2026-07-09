from flask import Flask, request, jsonify
from flask_cors import CORS

import numpy as np
import cv2
from datetime import datetime

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
# Teacher Profile API
# -------------------------------------

@app.route("/teacher/profile/<firebase_uid>", methods=["GET"])
def get_teacher_profile(firebase_uid):

    try:

        conn = get_db_connection()

        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT
                teacher_id,
                full_name,
                email,
                phone,
                department,
                designation
            FROM teachers
            WHERE firebase_uid=%s
        """, (firebase_uid,))

        teacher = cursor.fetchone()

        cursor.close()
        conn.close()

        if teacher:
            return jsonify(teacher)

        return jsonify({
            "message":"Teacher not found"
        }),404

    except Exception as e:

        return jsonify({
            "error":str(e)
        }),500
    

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
# Mark Attendance API
# -------------------------------------

@app.route("/attendance/mark", methods=["POST"])
def mark_attendance():

    try:

        data = request.json

        student_uid = data.get("student_uid")
        teacher_uid = data.get("teacher_uid")
        department = data.get("department")
        year = data.get("year")
        subject = data.get("subject")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get student details
        cursor.execute("""
            SELECT
                full_name,
                prn
            FROM students
            WHERE firebase_uid=%s
        """, (student_uid,))

        student = cursor.fetchone()

        if not student:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Student not found"
            }),404

        # Get teacher details

        cursor.execute("""
            SELECT
                full_name
            FROM teachers
            WHERE firebase_uid=%s
        """, (teacher_uid,))

        teacher = cursor.fetchone()

        if not teacher:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Teacher not found"
            }),404


        today = datetime.now().date()

        # Prevent duplicate attendance

        cursor.execute("""
            SELECT attendance_id
            FROM attendance
            WHERE
                student_uid=%s
            AND
                subject=%s
            AND
                attendance_date=%s
        """, (
            student_uid,
            subject,
            today
        ))

        already = cursor.fetchone()

        if already:

            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Attendance already marked"
            })


        now = datetime.now()

        cursor.execute("""

            INSERT INTO attendance(

                student_uid,
                teacher_uid,

                student_name,
                teacher_name,

                prn,

                department,
                year,
                subject,

                attendance_date,
                attendance_time,

                status

            )

            VALUES(

                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                'Present'

            )

        """, (

            student_uid,
            teacher_uid,

            student["full_name"],
            teacher["full_name"],

            student["prn"],

            department,
            year,
            subject,

            now.date(),
            now.time()

        ))

        conn.commit()

        cursor.close()
        conn.close()

        return jsonify({

            "success": True,
            "message": "Attendance Saved Successfully"

        })

    except Exception as e:

        return jsonify({

            "success": False,
            "message": str(e)

        }),500
    
# -------------------------------------

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )