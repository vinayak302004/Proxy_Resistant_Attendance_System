import os
from datetime import datetime

import cv2
import numpy as np

from flask import Flask, jsonify, request
from flask_cors import CORS

# ============================================
# Firebase Admin SDK
# ============================================

import firebase_admin
from firebase_admin import credentials
from firebase_admin import auth

# ============================================
# Existing project imports
# ============================================

from attendance_session import (
    get_session,
    refresh_session,
    start_session,
    stop_session
)

from database import get_db_connection
from face_verify import verify_face


# ============================================
# Flask App
# ============================================

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/*": {
            "origins": "*"
        }
    },
    allow_headers=[
        "Content-Type",
        "Authorization"
    ]
)


# ============================================
# Firebase Admin Initialization
# ============================================

SERVICE_ACCOUNT_PATH = os.path.join(
    os.path.dirname(__file__),
    "serviceAccountKey.json"
)

try:

    if not os.path.exists(SERVICE_ACCOUNT_PATH):
        raise FileNotFoundError(
            "serviceAccountKey.json not found in backend folder."
        )

    if not firebase_admin._apps:

        cred = credentials.Certificate(
            SERVICE_ACCOUNT_PATH
        )

        firebase_admin.initialize_app(cred)

    print("Firebase Admin SDK initialized successfully.")

except Exception as e:

    print(
        "Firebase initialization failed:",
        e
    )


# ============================================
# Helper - Verify Firebase Token
# ============================================

def verify_firebase_token():

    auth_header = request.headers.get("Authorization")

    if not auth_header:
        raise Exception("Authorization token missing.")

    if not auth_header.startswith("Bearer "):
        raise Exception("Invalid Authorization header.")

    id_token = auth_header.split(
        "Bearer ",
        1
    )[1]

    decoded_token = auth.verify_id_token(id_token)

    return decoded_token


# ============================================
# Home
# ============================================

@app.route("/")
def home():

    return jsonify({
        "success": True,
        "message": "Proxy-Resistant Smart Attendance Backend Running"
    })


# ============================================================
# FIREBASE AUTH + MYSQL LOGIN
# ============================================================
#
# Firebase checks the email/password on frontend.
#
# Then frontend sends:
#
# {
#     "email": "student@gmail.com",
#     "role": "student"
# }
#
# Backend finds the student in MySQL using EMAIL.
#
# PRN becomes the application identifier.
#
# ============================================================

@app.route(
    "/api/auth/login",
    methods=["POST"]
)
def api_login():

    try:

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "message": "No login data received."
            }), 400

        email = str(
            data.get("email", "")
        ).strip().lower()

        role = str(
            data.get("role", "")
        ).strip().lower()

        if not email:

            return jsonify({
                "success": False,
                "message": "Email is required."
            }), 400

        if role not in [
            "student",
            "teacher",
            "admin"
        ]:

            return jsonify({
                "success": False,
                "message": "Invalid role."
            }), 400


        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        # ========================================
        # STUDENT
        # ========================================

        if role == "student":

            cursor.execute(
                """
                SELECT
                    prn,
                    full_name,
                    email,
                    phone,
                    year,
                    branch,
                    division,
                    gender,
                    face_folder
                FROM students
                WHERE LOWER(email) = %s
                LIMIT 1
                """,
                (email,)
            )

            student = cursor.fetchone()

            cursor.close()
            conn.close()


            if not student:

                return jsonify({
                    "success": False,
                    "message":
                        "Student account exists in Firebase, "
                        "but no student record was found in MySQL."
                }), 404


            return jsonify({

                "success": True,

                "role": "student",

                "prn":
                    student["prn"],

                "student":
                    student

            }), 200


        # ========================================
        # TEACHER
        # ========================================

        if role == "teacher":

            cursor.execute(
                """
                SELECT
                    teacher_id,
                    full_name,
                    email,
                    phone,
                    department,
                    designation
                FROM teachers
                WHERE LOWER(email) = %s
                LIMIT 1
                """,
                (email,)
            )

            teacher = cursor.fetchone()

            cursor.close()
            conn.close()


            if not teacher:

                return jsonify({
                    "success": False,
                    "message":
                        "Teacher account not found in MySQL."
                }), 404


            return jsonify({

                "success": True,

                "role": "teacher",

                "teacher_id":
                    teacher["teacher_id"],

                "teacher":
                    teacher

            }), 200


        # ========================================
        # ADMIN
        # ========================================

        if role == "admin":

            cursor.execute(
                """
                SELECT
                    admin_id,
                    full_name,
                    email
                FROM admins
                WHERE LOWER(email) = %s
                LIMIT 1
                """,
                (email,)
            )

            admin = cursor.fetchone()

            cursor.close()
            conn.close()


            if not admin:

                return jsonify({
                    "success": False,
                    "message":
                        "Admin account not found in MySQL."
                }), 404


            return jsonify({

                "success": True,

                "role": "admin",

                "admin_id":
                    admin["admin_id"],

                "admin":
                    admin

            }), 200


    except Exception as e:

        print(
            "LOGIN ERROR:",
            str(e)
        )

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# ============================================================
# ADMIN - ADD STUDENT
# ============================================================
#
# Firebase:
#     Creates authentication account only.
#
# MySQL:
#     Stores complete student information.
#
# No firebase_uid is stored in MySQL.
# No Firestore student document is created.
#
# ============================================================

@app.route(
    "/api/students",
    methods=["POST"]
)
def add_student():

    firebase_uid = None

    conn = None
    cursor = None

    try:

        # ========================================
        # Verify Admin Firebase Token
        # ========================================

        decoded_token = verify_firebase_token()

        admin_uid = decoded_token.get("uid")

        print(
            "Admin Firebase UID:",
            admin_uid
        )


        # ========================================
        # Request Data
        # ========================================

        data = request.get_json()

        if not data:

            return jsonify({
                "success": False,
                "message":
                    "No student data received."
            }), 400


        prn = str(
            data.get("prn", "")
        ).strip()

        full_name = str(
            data.get("full_name", "")
        ).strip()

        email = str(
            data.get("email", "")
        ).strip().lower()

        password = str(
            data.get("password", "")
        )

        phone = str(
            data.get("phone", "")
        ).strip()

        year = str(
            data.get("year", "")
        ).strip()

        branch = str(
            data.get("branch", "")
        ).strip()

        division = str(
            data.get("division", "")
        ).strip()

        gender = data.get("gender")

        if gender:
            gender = str(gender).strip()

        face_folder = data.get("face_folder")

        if face_folder:
            face_folder = str(face_folder).strip()


        # ========================================
        # Validation
        # ========================================

        if not prn:
            return jsonify({
                "success": False,
                "message": "PRN is required."
            }), 400

        if not full_name:
            return jsonify({
                "success": False,
                "message": "Full name is required."
            }), 400

        if not email:
            return jsonify({
                "success": False,
                "message": "Email is required."
            }), 400

        if not password:
            return jsonify({
                "success": False,
                "message": "Password is required."
            }), 400

        if len(password) < 6:
            return jsonify({
                "success": False,
                "message":
                    "Password must contain at least 6 characters."
            }), 400

        if not phone:
            return jsonify({
                "success": False,
                "message": "Phone is required."
            }), 400

        if not year:
            return jsonify({
                "success": False,
                "message": "Year is required."
            }), 400

        if not branch:
            return jsonify({
                "success": False,
                "message": "Branch is required."
            }), 400

        if not division:
            return jsonify({
                "success": False,
                "message": "Division is required."
            }), 400


        # ========================================
        # MySQL Connection
        # ========================================

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        # ========================================
        # Check Duplicate PRN
        # ========================================

        cursor.execute(
            """
            SELECT
                id,
                prn,
                email
            FROM students
            WHERE prn = %s
            LIMIT 1
            """,
            (prn,)
        )

        existing_student = cursor.fetchone()

        if existing_student:

            return jsonify({

                "success": False,

                "message":
                    f"Student with PRN {prn} already exists."

            }), 409


        # ========================================
        # Check Duplicate Email in MySQL
        # ========================================

        cursor.execute(
            """
            SELECT
                id,
                prn
            FROM students
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )

        existing_email = cursor.fetchone()

        if existing_email:

            return jsonify({

                "success": False,

                "message":
                    f"Student with email {email} already exists."

            }), 409


        # ========================================
        # CREATE FIREBASE AUTH ACCOUNT
        # ========================================

        firebase_user = auth.create_user(

            email=email,

            password=password,

            display_name=full_name

        )

        firebase_uid = firebase_user.uid

        print(
            "Firebase authentication account created:",
            firebase_uid
        )


        # ========================================
        # INSERT INTO MYSQL
        # ========================================

        cursor.execute(
            """
            INSERT INTO students
            (
                prn,
                full_name,
                email,
                phone,
                year,
                branch,
                division,
                gender,
                face_folder
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,

            (
                prn,
                full_name,
                email,
                phone,
                year,
                branch,
                division,
                gender,
                face_folder
            )
        )


        conn.commit()


        # ========================================
        # Close DB
        # ========================================

        cursor.close()
        conn.close()

        cursor = None
        conn = None


        # ========================================
        # SUCCESS
        # ========================================

        return jsonify({

            "success": True,

            "message":
                "Student added successfully.",

            "student": {

                "prn":
                    prn,

                "full_name":
                    full_name,

                "email":
                    email,

                "phone":
                    phone,

                "year":
                    year,

                "branch":
                    branch,

                "division":
                    division,

                "gender":
                    gender,

                "face_folder":
                    face_folder

            }

        }), 201


    # ========================================
    # Firebase Email Exists
    # ========================================

    except auth.EmailAlreadyExistsError:

        if cursor:
            cursor.close()

        if conn:
            conn.close()


        return jsonify({

            "success": False,

            "message":
                "A Firebase account already exists with this email."

        }), 409


    # ========================================
    # Any Other Error
    # ========================================

    except Exception as e:

        print(
            "ADD STUDENT ERROR:",
            str(e)
        )


        try:

            if conn:
                conn.rollback()

        except Exception:
            pass


        # ========================================
        # Firebase Rollback
        # ========================================

        if firebase_uid:

            try:

                auth.delete_user(
                    firebase_uid
                )

                print(
                    "Firebase user rolled back:",
                    firebase_uid
                )

            except Exception as cleanup_error:

                print(
                    "Firebase cleanup error:",
                    cleanup_error
                )


        try:

            if cursor:
                cursor.close()

            if conn:
                conn.close()

        except Exception:
            pass


        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# ============================================================
# STUDENT PROFILE
# ============================================================
#
# IMPORTANT:
# PRN is used instead of Firebase UID.
#
# ============================================================

@app.route(
    "/student/profile/<prn>",
    methods=["GET"]
)
def get_student_profile(prn):

    try:

        prn = str(prn).strip()


        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        cursor.execute(
            """
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
            WHERE prn = %s
            LIMIT 1
            """,
            (prn,)
        )


        student = cursor.fetchone()


        cursor.close()
        conn.close()


        if not student:

            return jsonify({

                "success": False,

                "message":
                    "Student not found."

            }), 404


        return jsonify(student), 200


    except Exception as e:

        print(
            "STUDENT PROFILE ERROR:",
            str(e)
        )

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# ============================================================
# STUDENT ATTENDANCE
# ============================================================
@app.route("/student/attendance/<prn>", methods=["GET"])
def student_attendance(prn):

    try:
        prn = str(prn).strip()

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get student
        cursor.execute("""
            SELECT
                prn,
                full_name,
                branch,
                year
            FROM students
            WHERE prn = %s
            LIMIT 1
        """, (prn,))

        student = cursor.fetchone()

        if not student:
            cursor.close()
            conn.close()

            return jsonify({
                "success": False,
                "message": "Student not found."
            }), 404

        branch = student["branch"]
        year = student["year"]

        # Get ALL lectures for student's class
        cursor.execute("""
            SELECT
                session_id,
                subject,
                lecture_date,
                start_time,
                end_time
            FROM attendance_sessions
            WHERE department = %s
              AND year = %s
            ORDER BY lecture_date DESC, start_time DESC
        """, (branch, year))

        lectures = cursor.fetchall()

        attendance_list = []

        present = 0
        absent = 0

        for lecture in lectures:

            cursor.execute("""
                SELECT
                    attendance_time,
                    status
                FROM attendance
                WHERE session_id = %s
                  AND prn = %s
                LIMIT 1
            """, (
                lecture["session_id"],
                prn
            ))

            record = cursor.fetchone()

            if record:
                status = "Present"
                attendance_time = str(record["attendance_time"])
                present += 1
            else:
                status = "Absent"
                attendance_time = "-"
                absent += 1

            attendance_list.append({
                "subject": lecture["subject"],
                "date": str(lecture["lecture_date"]),
                "start_time": str(lecture["start_time"]),
                "end_time": (
                    str(lecture["end_time"])
                    if lecture["end_time"]
                    else "-"
                ),
                "status": status,
                "attendance_time": attendance_time
            })

        total = len(lectures)

        percentage = 0

        if total > 0:
            percentage = round(
                (present / total) * 100,
                2
            )

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,

            "summary": {
                "total": total,
                "present": present,
                "absent": absent,
                "percentage": percentage
            },

            "attendance": attendance_list
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

    
# ============================================================
# ATTENDANCE START
# ============================================================

@app.route(
    "/attendance/start",
    methods=["POST"]
)
def attendance_start():

    data = request.json


    session = start_session(

        data["teacher_id"],

        data["department"],

        data["year"],

        data["subject"],

        data["lat"],

        data["lng"]

    )


    return jsonify({

        "success": True,

        "session_id":
            session["session_id"],

        "qr_token":
            session["qr_token"]

    })


# ============================================================
# ATTENDANCE VERIFY
# ============================================================

@app.route(
    "/attendance/verify",
    methods=["POST"]
)
def attendance_verify():

    session = get_session()


    if session is None:

        return jsonify({

            "success": False,

            "message":
                "Attendance session not active"

        })


    data = request.json


    if data["qr_token"] != session["qr_token"]:

        return jsonify({

            "success": False,

            "message":
                "QR Expired"

        })


    return jsonify({

        "success": True,

        "session_id":
            session["session_id"]

    })


# ============================================================
# ATTENDANCE REFRESH
# ============================================================

@app.route(
    "/attendance/refresh",
    methods=["POST"]
)
def attendance_refresh():

    session = refresh_session()


    if session is None:

        return jsonify({
            "success": False
        })


    return jsonify({

        "success": True,

        "session_id":
            session["session_id"],

        "qr_token":
            session["qr_token"]

    })


# ============================================================
# ATTENDANCE STOP
# ============================================================

@app.route(
    "/attendance/stop",
    methods=["POST"]
)
def attendance_stop():

    stop_session()

    return jsonify({
        "success": True
    })


# ============================================================
# LIVE ATTENDANCE
# ============================================================

@app.route(
    "/attendance/live/<session_id>",
    methods=["GET"]
)
def live_attendance(session_id):

    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                subject,
                department,
                year,
                lecture_date,
                start_time,
                status
            FROM attendance_sessions
            WHERE session_id = %s
            """,
            (session_id,)
        )


        session = cursor.fetchone()


        if not session:

            cursor.close()
            conn.close()

            return jsonify({

                "success": False,

                "message":
                    "Session not found"

            }), 404


        if session["lecture_date"]:

            session["lecture_date"] = str(
                session["lecture_date"]
            )


        if session["start_time"]:

            session["start_time"] = str(
                session["start_time"]
            )


        cursor.execute(
            """
            SELECT
                prn,
                student_name,
                attendance_time,
                status
            FROM attendance
            WHERE session_id = %s
            ORDER BY attendance_time
            """,
            (session_id,)
        )


        students = cursor.fetchall()


        for row in students:

            if row["attendance_time"]:

                row["attendance_time"] = str(
                    row["attendance_time"]
                )


        cursor.close()
        conn.close()


        return jsonify({

            "success": True,

            "session": session,

            "students": students,

            "present_count":
                len(students)

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# ============================================================
# ATTENDANCE BY SESSION
# ============================================================

@app.route(
    "/attendance/session/<session_id>",
    methods=["GET"]
)
def attendance_by_session(session_id):

    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                department,
                year
            FROM attendance_sessions
            WHERE session_id = %s
            """,
            (session_id,)
        )


        session = cursor.fetchone()


        if not session:

            cursor.close()
            conn.close()

            return jsonify({

                "success": False,

                "message":
                    "Session not found"

            }), 404


        department = session["department"]
        year = session["year"]


        # ========================================
        # All students
        # ========================================

        cursor.execute(
            """
            SELECT
                prn,
                full_name
            FROM students
            WHERE branch = %s
              AND year = %s
            ORDER BY full_name
            """,
            (
                department,
                year
            )
        )


        all_students = cursor.fetchall()


        # ========================================
        # Present students
        # ========================================

        cursor.execute(
            """
            SELECT
                prn,
                attendance_time,
                status
            FROM attendance
            WHERE session_id = %s
            """,
            (session_id,)
        )


        present = cursor.fetchall()


        present_dict = {
            p["prn"]: p
            for p in present
        }


        final_list = []


        for student in all_students:

            prn = student["prn"]


            if prn in present_dict:

                final_list.append({

                    "prn":
                        prn,

                    "student_name":
                        student["full_name"],

                    "status":
                        "Present",

                    "attendance_time":
                        str(
                            present_dict[prn][
                                "attendance_time"
                            ]
                        )

                })

            else:

                final_list.append({

                    "prn":
                        prn,

                    "student_name":
                        student["full_name"],

                    "status":
                        "Absent",

                    "attendance_time":
                        "-"

                })


        cursor.close()
        conn.close()


        return jsonify({

            "success": True,

            "students":
                final_list

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# ============================================================
# TEACHER ATTENDANCE
# ============================================================

@app.route(
    "/teacher/attendance",
    methods=["GET"]
)
def teacher_attendance():

    department = request.args.get(
        "department"
    )

    year = request.args.get(
        "year"
    )

    subject = request.args.get(
        "subject"
    )

    date = request.args.get(
        "date"
    )


    try:

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                prn,
                student_name,
                attendance_time,
                status
            FROM attendance
            WHERE department = %s
              AND year = %s
              AND subject = %s
              AND attendance_date = %s
            ORDER BY student_name
            """,
            (
                department,
                year,
                subject,
                date
            )
        )


        students = cursor.fetchall()


        for row in students:

            if row["attendance_time"]:

                row["attendance_time"] = str(
                    row["attendance_time"]
                )


        cursor.close()
        conn.close()


        return jsonify({

            "success": True,

            "students":
                students

        })


    except Exception as e:

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )