import uuid
from datetime import datetime

from database import get_db_connection


def start_session(teacher_uid, department, year, subject, lat, lng):

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    session_id = str(uuid.uuid4())
    qr_token = str(uuid.uuid4())

    today = datetime.now().date()
    now = datetime.now().time()

    cursor.execute("""
        INSERT INTO attendance_sessions(

            session_id,
            qr_token,
            teacher_uid,
            subject,
            department,
            year,
            lecture_date,
            start_time,
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
        'ACTIVE'
        )

    """, (

        session_id,
        qr_token,
        teacher_uid,
        subject,
        department,
        year,
        today,
        now

    ))

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "session_id": session_id,
        "qr_token": qr_token
    }


def get_session():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""

        SELECT *

        FROM attendance_sessions

        WHERE status='ACTIVE'

        ORDER BY created_at DESC

        LIMIT 1

    """)

    session = cursor.fetchone()

    cursor.close()
    conn.close()

    return session


def refresh_session():

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    cursor.execute("""
        SELECT session_id
        FROM attendance_sessions
        WHERE status='ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
    """)

    session = cursor.fetchone()

    if not session:
        cursor.close()
        conn.close()
        return None

    new_token = str(uuid.uuid4())

    cursor.execute("""
        UPDATE attendance_sessions
        SET qr_token=%s
        WHERE session_id=%s
    """, (
        new_token,
        session["session_id"]
    ))

    conn.commit()

    cursor.close()
    conn.close()

    return {
        "session_id": session["session_id"],
        "qr_token": new_token
    }


def stop_session():

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""

        UPDATE attendance_sessions

        SET

        status='CLOSED',

        end_time=NOW()

        WHERE status='ACTIVE'

    """)

    conn.commit()

    cursor.close()
    conn.close()