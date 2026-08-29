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
# TEACHER PROFILE
# ============================================================
#
# IMPORTANT:
# teacher_id is used instead of Firebase UID.
#
# Example:
# /teacher/profile/E0001
#
# ============================================================

@app.route(
    "/teacher/profile/<teacher_id>",
    methods=["GET"]
)
def get_teacher_profile(teacher_id):

    try:

        teacher_id = str(
            teacher_id
        ).strip()


        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


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
            WHERE teacher_id = %s
            LIMIT 1
            """,
            (teacher_id,)
        )


        teacher = cursor.fetchone()


        cursor.close()
        conn.close()


        if not teacher:

            return jsonify({

                "success": False,

                "message":
                    "Teacher not found."

            }), 404


        return jsonify(teacher), 200


    except Exception as e:

        print(
            "TEACHER PROFILE ERROR:",
            str(e)
        )

        return jsonify({

            "success": False,

            "message":
                str(e)

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

    conn = None
    cursor = None

    try:

        session_id = str(session_id).strip()

        print("============================================")
        print("ATTENDANCE SESSION REQUEST")
        print("Session ID:", session_id)
        print("============================================")


        # ====================================================
        # DATABASE CONNECTION
        # ====================================================

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        # ====================================================
        # GET SESSION DETAILS
        # ====================================================

        cursor.execute(
            """
            SELECT
                session_id,
                teacher_id,
                subject,
                department,
                year,
                lecture_date,
                start_time,
                end_time,
                status
            FROM attendance_sessions
            WHERE session_id = %s
            LIMIT 1
            """,
            (session_id,)
        )

        session = cursor.fetchone()


        if not session:

            print(
                "SESSION NOT FOUND:",
                session_id
            )

            return jsonify({

                "success": False,

                "message":
                    "Session not found."

            }), 404


        print("Session found:")
        print(session)


        department = str(
            session["department"]
        ).strip()

        year = str(
            session["year"]
        ).strip()


        # ====================================================
        # GET ALL STUDENTS FOR THIS CLASS
        # ====================================================
        #
        # Students are considered part of the class when:
        #
        # students.branch = session.department
        # students.year   = session.year
        #
        # ====================================================

        cursor.execute(
            """
            SELECT
                prn,
                full_name
            FROM students
            WHERE TRIM(branch) = %s
              AND TRIM(year) = %s
            ORDER BY full_name ASC
            """,
            (
                department,
                year
            )
        )

        all_students = cursor.fetchall()


        print(
            "Total class students:",
            len(all_students)
        )


        # ====================================================
        # GET ATTENDANCE FOR THIS SESSION
        # ====================================================

        cursor.execute(
            """
            SELECT
                prn,
                student_name,
                attendance_time,
                status
            FROM attendance
            WHERE session_id = %s
            ORDER BY attendance_time ASC
            """,
            (session_id,)
        )

        attendance_records = cursor.fetchall()


        print(
            "Attendance records:",
            len(attendance_records)
        )


        # ====================================================
        # CONVERT ATTENDANCE RECORDS TO DICTIONARY
        # ====================================================

        attendance_dict = {}

        for record in attendance_records:

            prn = str(
                record["prn"]
            ).strip()


            if record["attendance_time"]:

                record["attendance_time"] = str(
                    record["attendance_time"]
                )


            attendance_dict[prn] = record


        # ====================================================
        # BUILD FINAL STUDENT LIST
        # ====================================================

        final_list = []


        for student in all_students:

            prn = str(
                student["prn"]
            ).strip()


            if prn in attendance_dict:

                record = attendance_dict[prn]


                final_list.append({

                    "prn":
                        prn,

                    "student_name":
                        student["full_name"],

                    "status":
                        "Present",

                    "attendance_time":
                        record["attendance_time"]
                        if record["attendance_time"]
                        else "-"

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


        # ====================================================
        # CLOSE DATABASE
        # ====================================================

        cursor.close()
        conn.close()

        cursor = None
        conn = None


        # ====================================================
        # COUNTS
        # ====================================================

        present_count = sum(
            1
            for student in final_list
            if student["status"] == "Present"
        )

        absent_count = sum(
            1
            for student in final_list
            if student["status"] == "Absent"
        )


        # ====================================================
        # RESPONSE
        # ====================================================

        return jsonify({

            "success": True,

            "session": {

                "session_id":
                    session["session_id"],

                "teacher_id":
                    session["teacher_id"],

                "subject":
                    session["subject"],

                "department":
                    session["department"],

                "year":
                    session["year"],

                "lecture_date":
                    str(
                        session["lecture_date"]
                    )
                    if session["lecture_date"]
                    else "",

                "start_time":
                    str(
                        session["start_time"]
                    )
                    if session["start_time"]
                    else "",

                "end_time":
                    str(
                        session["end_time"]
                    )
                    if session["end_time"]
                    else "",

                "status":
                    session["status"]

            },

            "summary": {

                "total":
                    len(final_list),

                "present":
                    present_count,

                "absent":
                    absent_count

            },

            "students":
                final_list

        }), 200


    except Exception as e:

        print(
            "ATTENDANCE BY SESSION ERROR:",
            str(e)
        )


        # ====================================================
        # CLEANUP
        # ====================================================

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
# TEACHER SESSIONS
# ============================================================
#
# Frontend calls:
#
# GET /teacher/sessions/<teacher_id>
#
# teacher_id from frontend:
#     E0001 / E0002
#
# Older attendance_sessions records may contain:
#     Firebase UID
#
# Therefore this endpoint:
#     1. Finds teacher using MySQL teacher_id
#     2. Gets teacher email
#     3. Gets Firebase UID using email
#     4. Finds sessions using either:
#           - MySQL teacher_id
#           - Firebase UID
#
# ============================================================

@app.route(
    "/teacher/sessions/<teacher_id>",
    methods=["GET"]
)
def teacher_sessions(teacher_id):

    conn = None
    cursor = None

    try:

        teacher_id = str(
            teacher_id
        ).strip()

        print("============================================")
        print("TEACHER SESSIONS REQUEST")
        print("Teacher ID:", teacher_id)
        print("============================================")


        # ====================================================
        # DATABASE CONNECTION
        # ====================================================

        conn = get_db_connection()

        cursor = conn.cursor(
            dictionary=True
        )


        # ====================================================
        # FIND TEACHER FROM MYSQL
        # ====================================================

        cursor.execute(
            """
            SELECT
                teacher_id,
                full_name,
                email,
                department
            FROM teachers
            WHERE teacher_id = %s
            LIMIT 1
            """,
            (teacher_id,)
        )

        teacher = cursor.fetchone()


        if not teacher:

            print(
                "TEACHER NOT FOUND:",
                teacher_id
            )

            return jsonify({

                "success": False,

                "message":
                    "Teacher not found."

            }), 404


        print("Teacher found:")
        print(teacher)


        teacher_email = str(
            teacher["email"]
        ).strip().lower()


        # ====================================================
        # GET FIREBASE UID
        # ====================================================

        firebase_uid = None

        try:

            firebase_user = auth.get_user_by_email(
                teacher_email
            )

            firebase_uid = firebase_user.uid

            print(
                "Firebase UID:",
                firebase_uid
            )

        except Exception as firebase_error:

            print(
                "Could not find Firebase user:",
                firebase_error
            )


        # ====================================================
        # GET TEACHER SESSIONS
        # ====================================================
        #
        # Support BOTH:
        #
        # New:
        #     teacher_id = E0002
        #
        # Old:
        #     teacher_id = Firebase UID
        #
        # ====================================================

        if firebase_uid:

            cursor.execute(
                """
                SELECT
                    session_id,
                    teacher_id,
                    subject,
                    lecture_date,
                    start_time,
                    end_time,
                    department,
                    year,
                    status
                FROM attendance_sessions
                WHERE teacher_id = %s
                   OR teacher_id = %s
                ORDER BY
                    lecture_date DESC,
                    start_time DESC
                """,
                (
                    teacher_id,
                    firebase_uid
                )
            )

        else:

            cursor.execute(
                """
                SELECT
                    session_id,
                    teacher_id,
                    subject,
                    lecture_date,
                    start_time,
                    end_time,
                    department,
                    year,
                    status
                FROM attendance_sessions
                WHERE teacher_id = %s
                ORDER BY
                    lecture_date DESC,
                    start_time DESC
                """,
                (teacher_id,)
            )


        sessions = cursor.fetchall()


        print(
            "Total sessions found:",
            len(sessions)
        )


        # ====================================================
        # CONVERT MYSQL DATE/TIME TO STRING
        # ====================================================

        for session in sessions:

            if session["lecture_date"]:

                session["lecture_date"] = str(
                    session["lecture_date"]
                )


            if session["start_time"]:

                session["start_time"] = str(
                    session["start_time"]
                )


            if session["end_time"]:

                session["end_time"] = str(
                    session["end_time"]
                )


        # ====================================================
        # CLOSE DATABASE
        # ====================================================

        cursor.close()
        conn.close()

        cursor = None
        conn = None


        # ====================================================
        # RESPONSE
        # ====================================================

        return jsonify({

            "success": True,

            "teacher_id":
                teacher_id,

            "sessions":
                sessions

        }), 200


    except Exception as e:

        print(
            "TEACHER SESSIONS ERROR:",
            str(e)
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
# VERIFY FACE
# ============================================================

@app.route(
    "/verify-face",
    methods=["POST"]
)
def verify_face_api():

    try:

        prn = request.form.get("prn")
        session_id = request.form.get("session_id")

        if not prn:
            return jsonify({
                "success": False,
                "verified": False,
                "message": "PRN is required."
            }), 400

        if not session_id:
            return jsonify({
                "success": False,
                "verified": False,
                "message": "Session ID is required."
            }), 400

        if "image" not in request.files:
            return jsonify({
                "success": False,
                "verified": False,
                "message": "Face image is required."
            }), 400

        image_file = request.files["image"]

        image_bytes = image_file.read()

        image_array = np.frombuffer(
            image_bytes,
            np.uint8
        )

        image = cv2.imdecode(
            image_array,
            cv2.IMREAD_COLOR
        )

        if image is None:
            return jsonify({
                "success": False,
                "verified": False,
                "message": "Invalid image."
            }), 400

        result = verify_face(
            image,
            prn,
            session_id
        )

        if not result.get("verified"):

            return jsonify({
                "success": False,
                "verified": False,
                "message": result.get(
                    "message",
                    "Face verification failed."
                )
            }), 401

        return jsonify({

            "success": True,

            "verified": True,

            "prn":
                result.get("prn"),

            "name":
                result.get("name"),

            "message":
                "Face verified successfully."

        }), 200

    except Exception as e:

        print(
            "VERIFY FACE ERROR:",
            str(e)
        )

        return jsonify({

            "success": False,

            "verified": False,

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