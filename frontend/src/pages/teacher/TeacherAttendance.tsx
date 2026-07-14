import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/attendance.css";
import { API_URL } from "../../config";

export default function TeacherAttendance() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState("");

  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const teacherUid = localStorage.getItem("uid");

      const res = await fetch(
        `${API_URL}/attendance/sessions?teacher_uid=${teacherUid}`
      );

      const data = await res.json();

      if (data.success) {
        setSessions(data.sessions);

        if (data.sessions.length > 0) {
          setSelectedSession(data.sessions[0].session_id);

          loadStudents(data.sessions[0].session_id);
        }
      }
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  const loadStudents = async (sessionId: string) => {
    try {
      const res = await fetch(
        `${API_URL}/attendance/session/${sessionId}`
      );

      const data = await res.json();

      if (data.success) {
        setStudents(data.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const currentLecture = sessions.find(
    (s) => s.session_id === selectedSession
  );

  return (
    <div className="attendance-page">

      <div className="attendance-header">

        <div>
          <h1>Teacher Attendance</h1>
          <p>Proxy Resistant Smart Attendance System</p>
        </div>

        <button
          className="back-btn"
          onClick={() => navigate("/teacher")}
        >
          ← Back
        </button>

      </div>

      {/* Lecture Selection */}

      <div className="filter-card">

        <div>

          <label>Select Lecture</label>

          <select
            value={selectedSession}
            onChange={(e) => {
              setSelectedSession(e.target.value);
              loadStudents(e.target.value);
            }}
          >

            {sessions.map((session) => (

              <option
                key={session.session_id}
                value={session.session_id}
              >

                {session.subject} | {session.lecture_date} |{" "}
                {session.start_time}

              </option>

            ))}

          </select>

        </div>

      </div>

      {/* Lecture Details */}

      {currentLecture && (

        <div className="table-card" style={{ marginBottom: 25 }}>

          <div style={{ padding: 25 }}>

            <h2>{currentLecture.subject}</h2>

            <p>
              <b>Department :</b> {currentLecture.department}
            </p>

            <p>
              <b>Year :</b> {currentLecture.year}
            </p>

            <p>
              <b>Date :</b> {currentLecture.lecture_date}
            </p>

            <p>
              <b>Time :</b>{" "}
              {currentLecture.start_time}
              {" - "}
              {currentLecture.end_time || "Running"}
            </p>

            <p>
              <b>Status :</b> {currentLecture.status}
            </p>

          </div>

        </div>

      )}

      {/* Summary */}

      <div className="summary-cards">

        <div className="summary-card">
          <h2>{students.length}</h2>
          <span>Total Students</span>
        </div>

        <div className="summary-card green">
          <h2>
            {students.filter(
              (x) => x.status === "Present"
            ).length}
          </h2>
          <span>Present</span>
        </div>

        <div className="summary-card red">
          <h2>
            {students.filter(
              (x) => x.status === "Absent"
            ).length}
          </h2>
          <span>Absent</span>
        </div>

      </div>

      {/* Attendance Table */}

      <div className="table-card">

        {loading ? (

          <h2 style={{ padding: 30 }}>Loading...</h2>

        ) : (

          <table>

            <thead>

              <tr>

                <th>PRN</th>

                <th>Name</th>

                <th>Status</th>

                <th>Time</th>

              </tr>

            </thead>

            <tbody>

              {students.length === 0 ? (

                <tr>

                  <td colSpan={4}>
                    No Attendance Found
                  </td>

                </tr>

              ) : (

                students.map((item: any, i: number) => (

                  <tr key={i}>

                    <td>{item.prn}</td>

                    <td>{item.student_name}</td>

                    <td>

                      <span
                        className={
                          item.status === "Present"
                            ? "status present"
                            : "status absent"
                        }
                      >
                        {item.status}
                      </span>

                    </td>

                    <td>{item.attendance_time}</td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        )}

      </div>

    </div>
  );
}