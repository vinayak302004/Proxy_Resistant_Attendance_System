import face_recognition
import cv2
import pickle
import pandas as pd
from datetime import datetime

with open("encodings.pickle", "rb") as f:
    data = pickle.load(f)

video = cv2.VideoCapture(0)

marked = []

def markAttendance(name):

    if name not in marked:

        marked.append(name)

        now = datetime.now()

        time = now.strftime("%H:%M:%S")

        date = now.strftime("%d-%m-%Y")

        df = pd.read_csv("attendance/Attendance.csv")

        new = pd.DataFrame([[name, time, date]],
                           columns=["Name","Time","Date"])

        df = pd.concat([df,new], ignore_index=True)

        df.to_csv("attendance/Attendance.csv", index=False)

while True:

    ret, frame = video.read()

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    boxes = face_recognition.face_locations(rgb)

    encodings = face_recognition.face_encodings(rgb, boxes)

    for encoding, box in zip(encodings, boxes):

        matches = face_recognition.compare_faces(
            data["encodings"],
            encoding
        )

        name = "Unknown"

        if True in matches:

            matchedIdx = matches.index(True)

            name = data["names"][matchedIdx]

            markAttendance(name)

        top, right, bottom, left = box

        cv2.rectangle(frame,
                      (left, top),
                      (right, bottom),
                      (0,255,0),
                      2)

        cv2.putText(frame,
                    name,
                    (left, top-10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.8,
                    (0,255,0),
                    2)

    cv2.imshow("Attendance System", frame)

    if cv2.waitKey(1)==27:
        break

video.release()

cv2.destroyAllWindows()