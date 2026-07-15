import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/attendance.css";
import { API_URL } from "../../config";

// Define strict TypeScript contracts for API data
interface Session {
  session_id: string;
  subject: string;
  lecture_date: string;
  start_time: string;
  end_time?: string;
  department: string;
  year: string;
  status: string;
}

interface Student {
  prn: string;
  student_name: string;
  status: string;
  attendance_time: string;
}

export default function TeacherAttendance() {
  const navigate = useNavigate();

  // State Management
  const [loading, setLoading] = useState<boolean>(true);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");

  // Load teacher sessions on initial mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const teacherUid = localStorage.getItem("uid");
      const res = await fetch(`${API_URL}/teacher/sessions/${teacherUid}`);
      const data = await res.json();

      if (data.success && data.sessions.length > 0) {
        setSessions(data.sessions);

        // Auto-select and load the first session
        const firstSession = data.sessions[0];
        setSelectedSubject(firstSession.subject);
        setSelectedDate(firstSession.lecture_date);
        setSelectedSession(firstSession.session_id);
        
        await loadStudents(firstSession.session_id);
      } else {
        setSessions([]);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async (sessionId: string) => {
    if (!sessionId) return;
    setStudentsLoading(true);
    try {
      const res = await fetch(`${API_URL}/attendance/session/${sessionId}`);
      const data = await res.json();

      if (data.success) {
        setStudents(data.students);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Memoized Select Dropdown Options
  const subjects = useMemo(() => {
    return [...new Set(sessions.map((s) => s.subject))];
  }, [sessions]);

  const dates = useMemo(() => {
    return [
      ...new Set(
        sessions
          .filter((s) => s.subject === selectedSubject)
          .map((s) => s.lecture_date)
      ),
    ];
  }, [sessions, selectedSubject]);

  const lectureTimes = useMemo(() => {
    return sessions.filter(
      (s) => s.subject === selectedSubject && s.lecture_date === selectedDate
    );
  }, [sessions, selectedSubject, selectedDate]);

  // Find currently selected session details
  const currentLecture = useMemo(() => {
    return sessions.find((s) => s.session_id === selectedSession);
  }, [sessions, selectedSession]);

  return (
    <div className="attendance-page">
      {/* Header */}
      <div className="attendance-header">
        <div>
          <h1>Teacher Attendance</h1>
          <p>Proxy Resistant Smart Attendance System</p>
        </div>
        <button className="back-btn" onClick={() => navigate("/teacher")}>
          &larr; Back
        </button>
      </div>

      {/* Dropdown Filter Card */}
      <div className="filter-card">
        <div>
          <label htmlFor="subject-select">Subject</label>
          <select
            id="subject-select"
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedDate("");
              setSelectedSession("");
              setStudents([]);
            }}
          >
            <option value="">Select Subject</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="date-select">Date</label>
          <select
            id="date-select"
            value={selectedDate}
            disabled={!selectedSubject}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedSession("");
              setStudents([]);
            }}
          >
            <option value="">Select Date</option>
            {dates.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="time-select">Lecture Time</label>
          <select
            id="time-select"
            value={selectedSession}
            disabled={!selectedDate}
            onChange={(e) => {
              const sessionId = e.target.value;
              setSelectedSession(sessionId);
              loadStudents(sessionId);
            }}
          >
            <option value="">Select Lecture</option>
            {lectureTimes.map((session) => (
              <option key={session.session_id} value={session.session_id}>
                {session.start_time} - {session.end_time || "Running"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Current Session Summary Details */}
      {currentLecture && (
        <div className="table-card" style={{ marginBottom: 25 }}>
          <div style={{ padding: 25 }}>
            <h2>{currentLecture.subject}</h2>
            <p><b>Department:</b> {currentLecture.department}</p>
            <p><b>Year:</b> {currentLecture.year}</p>
            <p><b>Date:</b> {currentLecture.lecture_date}</p>
            <p><b>Time:</b> {currentLecture.start_time} - {currentLecture.end_time || "Running"}</p>
            <p><b>Status:</b> {currentLecture.status}</p>
          </div>
        </div>
      )}

      {/* Metrics Card */}
      <div className="summary-cards">

        <div className="summary-card">
            <h2>{students.length}</h2>
            <span>Total Students</span>
        </div>

        <div className="summary-card green">
            <h2>
                {students.filter(
                    (s) => s.status === "Present"
                ).length}
            </h2>

            <span>Present</span>
        </div>

        <div className="summary-card red">
            <h2>
                {students.filter(
                    (s) => s.status === "Absent"
                ).length}
            </h2>

            <span>Absent</span>
        </div>

    </div>

      {/* Student List Table */}
      <div className="table-card">
        {loading || studentsLoading ? (
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
                  <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
                    No Attendance Found
                  </td>
                </tr>
              ) : (
                students.map((student, index) => (
                  <tr key={student.prn || index}>
                    <td>{student.prn}</td>
                    <td>{student.student_name}</td>
                    <td>
                      <span
                          className={
                              student.status === "Present"
                                  ? "status present"
                                  : "status absent"
                          }
                      >
                          {student.status}
                      </span>
                    </td>
                    <td>{student.attendance_time}</td>
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