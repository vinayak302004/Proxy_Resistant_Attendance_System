from datetime import datetime
import cv2
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS

from attendance_session import (
    get_session,
    refresh_session,
    start_session,
    stop_session,
)
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
            SELECT teacher_id, full_name, email, phone, department, designation
            FROM teachers
            WHERE firebase_uid = %s
        """, (firebase_uid,))

        teacher = cursor.fetchone()
        cursor.close()
        conn.close()

        if teacher:
            return jsonify(teacher)

        return jsonify({"message": "Teacher not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# -------------------------------------
# Student Profile API
# -------------------------------------

@app.route("/student/profile/<firebase_uid>", methods=["GET"])
def get_student_profile(firebase_uid):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT full_name, prn, email, phone, year, branch, division, gender, face_folder
            FROM students
            WHERE firebase_uid = %s
        """, (firebase_uid,))

        student = cursor.fetchone()
        cursor.close()
        conn.close()

        if student:
            return jsonify(student)

        return jsonify({"message": "Student not found"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

    session_id = request.form.get("session_id")
    result = verify_face(image, firebase_uid, session_id)

    return jsonify(result)

# -------------------------------------
# Mark Attendance API
# -------------------------------------

@app.route("/attendance/mark", methods=["POST"])
def mark_attendance():
    try:
        data = request.json
        student_uid = data.get("student_uid")
        session_id = data.get("session_id")

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get session details
        cursor.execute("""
            SELECT teacher_uid, department, year, subject
            FROM attendance_sessions
            WHERE session_id = %s
        """, (session_id,))
        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Invalid Session"
            }), 404

        teacher_uid = session["teacher_uid"]
        department = session["department"]
        year = session["year"]
        subject = session["subject"]

        # Get student details
        cursor.execute("""
            SELECT full_name, prn
            FROM students
            WHERE firebase_uid = %s
        """, (student_uid,))
        student = cursor.fetchone()

        if not student:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Student not found"
            }), 404

        # Get teacher details
        cursor.execute("""
            SELECT full_name
            FROM teachers
            WHERE firebase_uid = %s
        """, (teacher_uid,))
        teacher = cursor.fetchone()

        if not teacher:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Teacher not found"
            }), 404

        today = datetime.now().date()

        # Prevent duplicate attendance
        cursor.execute("""
            SELECT attendance_id
            FROM attendance
            WHERE student_uid = %s
              AND subject = %s
              AND attendance_date = %s
        """, (student_uid, subject, today))
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
            INSERT INTO attendance (
                session_id, student_uid, teacher_uid, student_name, teacher_name,
                prn, department, year, subject, attendance_date, attendance_time, status
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Present')
        """, (
            session_id, student_uid, teacher_uid, student["full_name"], teacher["full_name"],
            student["prn"], department, year, subject, now.date(), now.time()
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
        }), 500

@app.route("/attendance/start", methods=["POST"])
def attendance_start():
    data = request.json
    session = start_session(
        data["teacher_uid"],
        data["department"],
        data["year"],
        data["subject"],
        data["lat"],
        data["lng"]
    )
    return jsonify({
        "success": True,
        "session_id": session["session_id"]
    })

@app.route("/attendance/verify", methods=["POST"])
def attendance_verify():
    session = get_session()
    if session is None:
        return jsonify({
            "success": False,
            "message": "Attendance session not active"
        })

    data = request.json
    if data["session_id"] != session["session_id"]:
        return jsonify({
            "success": False,
            "message": "Invalid QR Code"
        })

    return jsonify({"success": True})

@app.route("/attendance/refresh", methods=["POST"])
def attendance_refresh():
    session = refresh_session()
    if session is None:
        return jsonify({"success": False})

    return jsonify({
        "success": True,
        "session_id": session["session_id"]
    })

@app.route("/attendance/stop", methods=["POST"])
def attendance_stop():
    stop_session()
    return jsonify({"success": True})

@app.route("/attendance/all", methods=["GET"])
def attendance_all():
    teacher_uid = request.args.get("teacher_uid")
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT prn, student_name, department, year, subject, attendance_date, attendance_time, status
            FROM attendance
            WHERE teacher_uid = %s
            ORDER BY attendance_date DESC, attendance_time DESC
        """, (teacher_uid,))
        rows = cursor.fetchall()

        for row in rows:
            if row["attendance_date"]:
                row["attendance_date"] = str(row["attendance_date"])
            if row["attendance_time"]:
                row["attendance_time"] = str(row["attendance_time"])

        cursor.close()
        conn.close()
        return jsonify(rows)

    except Exception as e:
        print("ATTENDANCE ALL ERROR:", e)
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route("/attendance/live/<session_id>", methods=["GET"])
def live_attendance(session_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get Session Details
        cursor.execute("""
            SELECT subject, department, year, lecture_date, start_time, status
            FROM attendance_sessions
            WHERE session_id = %s
        """, (session_id,))
        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Session not found"
            }), 404

        if session["lecture_date"]:
            session["lecture_date"] = str(session["lecture_date"])
        if session["start_time"]:
            session["start_time"] = str(session["start_time"])

        # Get Students
        cursor.execute("""
            SELECT prn, student_name, attendance_time, status
            FROM attendance
            WHERE session_id = %s
            ORDER BY attendance_time
        """, (session_id,))
        students = cursor.fetchall()

        for row in students:
            if row["attendance_time"]:
                row["attendance_time"] = str(row["attendance_time"])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "session": session,
            "students": students,
            "present_count": len(students)
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route("/teacher/sessions/<teacher_uid>", methods=["GET"])
def teacher_sessions(teacher_uid):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT session_id, subject, department, year, lecture_date, start_time, end_time, status
            FROM attendance_sessions
            WHERE teacher_uid = %s
            ORDER BY lecture_date DESC, start_time DESC
        """, (teacher_uid,))
        sessions = cursor.fetchall()

        for row in sessions:
            if row["lecture_date"]:
                row["lecture_date"] = str(row["lecture_date"])
            if row["start_time"]:
                row["start_time"] = str(row["start_time"])
            if row["end_time"]:
                row["end_time"] = str(row["end_time"])

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "sessions": sessions
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route("/attendance/session/<session_id>", methods=["GET"])
def attendance_by_session(session_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Get Session
        cursor.execute("""
            SELECT department, year
            FROM attendance_sessions
            WHERE session_id = %s
        """, (session_id,))
        session = cursor.fetchone()

        if not session:
            cursor.close()
            conn.close()
            return jsonify({
                "success": False,
                "message": "Session not found"
            }), 404

        department = session["department"]
        year = session["year"]

        # Get ALL students
        cursor.execute("""
            SELECT prn, full_name
            FROM students
            WHERE branch = %s AND year = %s
            ORDER BY full_name
        """, (department, year))
        all_students = cursor.fetchall()

        # Get Present Students
        cursor.execute("""
            SELECT prn, attendance_time, status
            FROM attendance
            WHERE session_id = %s
        """, (session_id,))
        present = cursor.fetchall()

        present_dict = {p["prn"]: p for p in present}
        final_list = []

        for student in all_students:
            prn = student["prn"]
            if prn in present_dict:
                final_list.append({
                    "prn": prn,
                    "student_name": student["full_name"],
                    "status": "Present",
                    "attendance_time": str(present_dict[prn]["attendance_time"])
                })
            else:
                final_list.append({
                    "prn": prn,
                    "student_name": student["full_name"],
                    "status": "Absent",
                    "attendance_time": "-"
                })

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "students": final_list
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route("/teacher/attendance", methods=["GET"])
def teacher_attendance():
    department = request.args.get("department")
    year = request.args.get("year")
    subject = request.args.get("subject")
    date = request.args.get("date")

    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT prn, student_name, attendance_time, status
            FROM attendance
            WHERE department = %s
              AND year = %s
              AND subject = %s
              AND attendance_date = %s
            ORDER BY student_name
        """, (department, year, subject, date))
        students = cursor.fetchall()

        cursor.close()
        conn.close()

        return jsonify({
            "success": True,
            "students": students
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# -------------------------------------
# Student Attendance Dashboard
# -------------------------------------

@app.route("/student/attendance/<firebase_uid>", methods=["GET"])
def student_attendance(firebase_uid):

    try:

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # ----------------------------
        # Student Details
        # ----------------------------

        cursor.execute("""
            SELECT
                prn,
                full_name,
                branch,
                year
            FROM students
            WHERE firebase_uid=%s
        """,(firebase_uid,))

        student = cursor.fetchone()

        if not student:

            cursor.close()
            conn.close()

            return jsonify({
                "success":False,
                "message":"Student not found"
            }),404

        prn = student["prn"]
        branch = student["branch"]
        year = student["year"]

        # ----------------------------
        # All Lectures
        # ----------------------------

        cursor.execute("""
            SELECT
                session_id,
                subject,
                lecture_date,
                start_time,
                end_time
            FROM attendance_sessions
            WHERE
                department=%s
            AND
                year=%s
            ORDER BY lecture_date DESC,start_time DESC
        """,(branch,year))

        lectures = cursor.fetchall()

        attendance_list = []

        present = 0
        absent = 0

        for lecture in lectures:

            cursor.execute("""
                SELECT
                    attendance_time
                FROM attendance
                WHERE
                    session_id=%s
                AND
                    prn=%s
            """,(lecture["session_id"],prn))

            record = cursor.fetchone()

            if record:

                status="Present"
                time=str(record["attendance_time"])
                present +=1

            else:

                status="Absent"
                time="-"
                absent +=1

            attendance_list.append({

                "subject":lecture["subject"],

                "date":str(lecture["lecture_date"]),

                "start_time":str(lecture["start_time"]),

                "end_time":str(lecture["end_time"])
                    if lecture["end_time"]
                    else "-",

                "status":status,

                "attendance_time":time

            })

        total=len(lectures)

        percentage=0

        if total>0:

            percentage=round((present/total)*100,2)

        cursor.close()
        conn.close()

        return jsonify({

            "success":True,

            "summary":{

                "total":total,
                "present":present,
                "absent":absent,
                "percentage":percentage

            },

            "attendance":attendance_list

        })

    except Exception as e:

        return jsonify({

            "success":False,
            "message":str(e)

        }),500
    
    
if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )