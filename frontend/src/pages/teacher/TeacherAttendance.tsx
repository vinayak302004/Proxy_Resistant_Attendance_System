import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/attendance.css";
import { API_URL } from "../../config";

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
  const [loading, setLoading] = useState<boolean>(true);
  const [studentsLoading, setStudentsLoading] = useState<boolean>(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [downloading, setDownloading] = useState<boolean>(false);

  useEffect(() => {
    loadSessions();
  }, []);
  const loadSessions = async () => {
    setLoading(true);
    try {
      const teacherId = localStorage.getItem("teacher_id");
      if (!teacherId) {
        console.error("Teacher ID not found.");
        setSessions([]);
        return;
      }
      const res = await fetch(
        `${API_URL}/teacher/sessions/${teacherId}`
      );
      const data = await res.json();
      if (data.success && data.sessions.length > 0) {
        setSessions(data.sessions);
        const latestMonth =
          data.sessions[0].lecture_date.substring(0, 7);
        setSelectedMonth(latestMonth);
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
  const markStudentPresent = async (prn: string, studentName: string) => {
  if (!selectedSession) {
    alert("Please select a lecture first.");
    return;
  }
  const teacherId = localStorage.getItem("teacher_id");
  if (!teacherId) {
    alert("Teacher ID not found. Please login again.");
    return;
  }
  const confirmed = window.confirm(
    `Are you sure you want to mark ${studentName} as Present?`
  );
  if (!confirmed) {
    return;
  }
  try {
    const response = await fetch(
      `${API_URL}/teacher/attendance/mark-present`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teacher_id: teacherId,
          session_id: selectedSession,
          prn: prn,
        }),
      }
    );
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Failed to update attendance."
      );
    }
    alert(
      `✅ ${studentName} has been marked Present.`
    );
    await loadStudents(selectedSession);
  } catch (error) {
    console.error(
      "Mark present error:",
      error
    );
    alert(
      error instanceof Error
        ? error.message
        : "Failed to update attendance."
    );
  }
};
  const downloadExcel = async (
    type: "attendance" | "defaulters"
  ) => {
    const teacherId = localStorage.getItem("teacher_id");
    if (!teacherId) {
      alert("Teacher ID not found.");
      return;
    }
    if (!selectedMonth) {
      alert("Please select a month.");
      return;
    }
    setDownloading(true);
    try {
      const endpoint =
        type === "attendance"
          ? `/teacher/monthly-attendance/${teacherId}/excel`
          : `/teacher/monthly-defaulters/${teacherId}/excel`;
      const response = await fetch(
        `${API_URL}${endpoint}?month=${selectedMonth}`
      );
      if (!response.ok) {
        let message = "Failed to download Excel.";
        try {
          const data = await response.json();
          if (data.message) {
            message = data.message;
          }
        } catch {
        }
        throw new Error(message);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download =
        type === "attendance"
          ? `Monthly_Attendance_${selectedMonth}.xlsx`
          : `Defaulter_Attendance_${selectedMonth}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Excel download error:",
        error
      );
      alert(
        error instanceof Error
          ? error.message
          : "Failed to download Excel."
      );
    } finally {
      setDownloading(false);
    }
  };
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
  const months = useMemo(() => {
    const uniqueMonths = new Set<string>();
    sessions.forEach((session) => {
      if (session.lecture_date) {
        uniqueMonths.add(
          session.lecture_date.substring(0, 7)
        );
      }
    });
    return Array.from(uniqueMonths).sort().reverse();
  }, [sessions]);
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
        <div className="monthly-report-card">

          <div className="monthly-report-header">
            <div>
              <h2>Monthly Attendance Report</h2>
              <p>
                Download attendance report and defaulter list
              </p>
            </div>
          </div>
          <div className="monthly-report-controls">
            <div className="month-selector">
              <label htmlFor="month-select">
                Select Month
              </label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(e.target.value)
                }
                disabled={months.length === 0}
              >
                <option value="">
                  Select Month
                </option>
                {months.map((month) => {
                  const [year, monthNumber] =
                    month.split("-");
                  const monthName = new Date(
                    Number(year),
                    Number(monthNumber) - 1,
                    1
                  ).toLocaleString(
                    "en-US",
                    {
                      month: "long",
                      year: "numeric"
                    }
                  );
                  return (
                    <option
                      key={month}
                      value={month}
                    >
                      {monthName}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="report-buttons">
              <button
                className="excel-btn"
                onClick={() =>
                  downloadExcel("attendance")
                }
                disabled={
                  !selectedMonth ||
                  downloading
                }
              >
                {downloading
                  ? "Generating..."
                  : "📊 Download Monthly Attendance"}
              </button>
              <button
                className="defaulter-btn"
                onClick={() =>
                  downloadExcel("defaulters")
                }
                disabled={
                  !selectedMonth ||
                  downloading
                }
              >
                {downloading
                  ? "Generating..."
                  : "⚠ Download Defaulter List"}
              </button>
            </div>
          </div>
        </div>
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
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: "center",
                      padding: "20px",
                    }}
                  >
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
                    <td>
                      {student.attendance_time}
                    </td>
                    <td>
                      {student.status === "Absent" ? (
                        <button
                          className="mark-present-btn"
                          onClick={() =>
                            markStudentPresent(
                              student.prn,
                              student.student_name
                            )
                          }
                        >
                          ✓ Mark Present
                        </button>
                      ) : (
                        <span
                          style={{
                            color: "#6b7280",
                            fontSize: "13px",
                          }}
                        >
                          —
                        </span>
                      )}
                    </td>
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