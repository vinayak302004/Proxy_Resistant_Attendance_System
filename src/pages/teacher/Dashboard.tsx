import { useEffect, useState, useRef } from "react";
import "../../styles/dashboard.css";

export default function Dashboard() {

  const [attendanceActive, setAttendanceActive] = useState(false);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [sessionId, setSessionId] = useState("SESSION_INIT");

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<any>(null);

  // 🔌 WebSocket Connection
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

      if (data.type === "attendance") {
        setAttendanceCount((c) => c + 1);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // 🔥 Create QR Session (with expiry)
  const createSession = () => {
    const id = "SESSION_" + Date.now();
    const expiry = Date.now() + 3000;
    return `${id}|${expiry}`;
  };

  // ▶ Start Session (WITH GPS)
  const startSession = () => {

    if (!selectedClass || !selectedSubject) {
      alert("⚠ Please select class and subject");
      return;
    }

    // 📍 Get teacher location
    navigator.geolocation.getCurrentPosition(
      (pos) => {

        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        console.log("📍 Teacher Location:", lat, lng);

        setAttendanceCount(0);

        const sendSession = () => {
          const newSession = createSession();
          setSessionId(newSession);

          wsRef.current?.send(JSON.stringify({
            type: "session",
            sessionId: newSession,
            class: selectedClass,
            subject: selectedSubject,
            lat: lat,
            lng: lng
          }));
        };

        // 🔥 Send immediately
        sendSession();

        // 🔁 Keep updating QR every 3 sec
        intervalRef.current = setInterval(sendSession, 3000);
      },

      // ❌ If location denied
      () => {
        alert("❌ Location permission required to start attendance");
      }
    );
  };

  // ⏹ Stop Session
  const stopSession = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSessionId("SESSION_ENDED");
  };

  const toggleSession = () => {
    if (!attendanceActive) {
      startSession();
    } else {
      stopSession();
    }

    setAttendanceActive(!attendanceActive);
  };

  return (
    <>
      <header>
        <h1>Proxy-Resistant Smart Attendance System</h1>
      </header>

      <div className="container">

        {/* LEFT PANEL */}
        <div className="card">

          <h2>Welcome, Teacher</h2>

          {/* 🎓 Class Selection */}
          <label>Select Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          >
            <option value="">Select Class</option>
            <option value="SY AIML">SY AIML</option>
            <option value="TY AIML">TY AIML</option>
          </select>

          {/* 📚 Subject Selection */}
          <label>Select Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Select Subject</option>
            <option value="Machine Learning">Machine Learning</option>
            <option value="DBMS">DBMS</option>
          </select>

          {/* ▶ Start/Stop Button */}
          <button onClick={toggleSession}>
            {attendanceActive ? "Stop Attendance" : "Start Attendance"}
          </button>

          {/* 📊 Status */}
          <div className="status-box">
            <p><strong>Status:</strong> {attendanceActive ? "Active" : "Inactive"}</p>
            <p><strong>Count:</strong> {attendanceCount}</p>
          </div>

          {/* 📄 Report */}
          <button onClick={() => window.location.href = "/reports"}>
            Attendance Report
          </button>

        </div>

        {/* RIGHT PANEL */}
        <div className="card center">

          <h2>Live Session QR</h2>

          <p style={{ fontSize: "12px", wordBreak: "break-all" }}>
            {sessionId}
          </p>

          {attendanceActive ? (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${sessionId}`}
              alt="QR Code"
            />
          ) : (
            <p style={{ color: "gray" }}>Session not active</p>
          )}

        </div>

      </div>
    </>
  );
}