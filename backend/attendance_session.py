import uuid
from datetime import datetime

from database import get_db_connection


def start_session(teacher_uid, department, year, subject, lat, lng):

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    session_id = str(uuid.uuid4())

    today = datetime.now().date()
    now = datetime.now().time()

    cursor.execute("""
        INSERT INTO attendance_sessions(

            session_id,
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
            'ACTIVE'

        )

    """, (

        session_id,
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
        "session_id": session_id
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

    """
    IMPORTANT

    Session ID should NEVER change.

    We only return the active session.

    """

    return get_session()


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