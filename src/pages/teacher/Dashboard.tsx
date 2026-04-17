import { useEffect, useState } from "react";
import "../../styles/dashboard.css";

export default function Dashboard() {

  const [attendanceActive, setAttendanceActive] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [sessionId, setSessionId] = useState("ABC123");

  useEffect(() => {
    if (localStorage.getItem("role") !== "teacher") {
      window.location.href = "/";
    }

    const ws = new WebSocket("ws://localhost:8080");

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      if (data.type === "attendance") {
        setAttendanceCount((c) => c + 1);
      }
    };
  }, []);

  const toggleSession = () => {
    setAttendanceActive(!attendanceActive);

    if (!attendanceActive) {
      startQRCode();
    }
  };

  const startQRCode = () => {
    setInterval(() => {
      const newSession = "SESSION_" + Date.now();
      setSessionId(newSession);
    }, 5000);
  };

  return (
    <>
      <header>
        <h1>Proxy-Resistant Smart Attendance System</h1>
      </header>

      <div className="container">

        <div className="card">
          <h2>Welcome, Mr. Smith</h2>

          <label>Select Class</label>
          <select>
            <option>Select Class</option>
            <option>SY AIML</option>
            <option>TY AIML</option>
          </select>

          <label>Select Subject</label>
          <select>
            <option>Select Subject</option>
            <option>Machine Learning</option>
            <option>DBMS</option>
          </select>

          <button onClick={toggleSession}>
            {attendanceActive ? "Stop Attendance" : "Start Attendance"}
          </button>

          <div className="status-box">
            <p><strong>Status:</strong> {attendanceActive ? "Active" : "Inactive"}</p>
            <p><strong>Count:</strong> {attendanceCount}</p>
          </div>

          <button onClick={() => window.location.href="/reports"}>
            Attendance Report
          </button>
        </div>

        <div className="card center">
          <h2>Live Session</h2>

          <p>{sessionId}</p>

          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${sessionId}`}
          />
        </div>

      </div>
    </>
  );
}