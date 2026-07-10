import uuid
from datetime import datetime

active_session = None


def start_session(teacher_uid, department, year, subject, lat, lng):
    global active_session

    active_session = {
        "session_id": str(uuid.uuid4()),
        "teacher_uid": teacher_uid,
        "department": department,
        "year": year,
        "subject": subject,
        "lat": lat,
        "lng": lng,
        "created": datetime.now()
    }

    return active_session


def refresh_session():
    global active_session

    if active_session is None:
        return None

    active_session["session_id"] = str(uuid.uuid4())
    active_session["created"] = datetime.now()

    return active_session


def get_session():
    return active_session


def stop_session():
    global active_session
    active_session = None