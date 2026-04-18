import { useEffect, useState, useRef } from "react";
import "../../styles/dashboard.css";

export default function Dashboard() {

  const [attendanceActive, setAttendanceActive] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [sessionId, setSessionId] = useState("SESSION_INIT");

  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<any>(null);

  // ✅ Connect WebSocket once
  useEffect(() => {
    if (localStorage.getItem("role") !== "teacher") {
      window.location.href = "/";
      return;
    }

    const ws = new WebSocket(`ws://${window.location.hostname}:8080`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("WebSocket Connected ✅");
    };

    ws.onmessage = (message) => {
      const data = JSON.parse(message.data);
      console.log("📩 Received:", data);

      if (data.type === "attendance") {
        setAttendanceCount((c) => c + 1);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
    };

    ws.onclose = () => {
      console.log("WebSocket Closed");
    };

    return () => {
      ws.close();
    };
  }, []);

  // ✅ Start / Stop Attendance Session
  const toggleSession = () => {
    if (!attendanceActive) {
      startSession();
    } else {
      stopSession();
    }

    setAttendanceActive(!attendanceActive);
  };

  // ✅ Start QR rotation every 3 sec
  const startSession = () => {
    setAttendanceCount(0);

    const newSession = "SESSION_" + Date.now();
    setSessionId(newSession);

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "session",
        sessionId: newSession
      }));
    }

    intervalRef.current = setInterval(() => {
      const newSession = "SESSION_" + Date.now();
      setSessionId(newSession);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "session",
          sessionId: newSession
        }));
      }

    }, 3000);
  };

  // ✅ Stop session
  const stopSession = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSessionId("SESSION_ENDED");
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

          {attendanceActive && (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${sessionId}`}
            />
          )}

          {!attendanceActive && (
            <p style={{ color: "gray" }}>Session not active</p>
          )}
        </div>

      </div>
    </>
  );
}