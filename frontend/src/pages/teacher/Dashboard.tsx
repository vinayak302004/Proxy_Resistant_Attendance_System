import { useEffect, useState, useRef } from "react";
import "../../styles/dashboard.css";

const departmentSubjects: {
  [department: string]: {
    [year: string]: string[];
  };
} = {
  AIML: {
    "First Year": [
      "Engineering Mathematics",
      "Programming in C",
      "Engineering Physics",
      "Engineering Chemistry",
      "Basic Electronics",
    ],

    "Second Year": [
      "Data Structures",
      "Object Oriented Programming",
      "DBMS",
      "Discrete Mathematics",
      "Computer Organization",
    ],

    "Third Year": [
      "Machine Learning",
      "Operating Systems",
      "Computer Networks",
      "Software Engineering",
      "Theory of Computation",
    ],

    "Final Year": [
      "Deep Learning",
      "Artificial Intelligence",
      "Cloud Computing",
      "Big Data Analytics",
      "Natural Language Processing",
    ],
  },

  CSE: {
    "First Year": [
      "Engineering Mathematics",
      "Programming in C",
      "Physics",
    ],

    "Second Year": [
      "Java",
      "DBMS",
      "Data Structures",
    ],

    "Third Year": [
      "Operating Systems",
      "Computer Networks",
      "Software Engineering",
    ],

    "Final Year": [
      "Cloud Computing",
      "Cyber Security",
      "Big Data",
    ],
  },
};

export default function Dashboard() {
  const [teacher, setTeacher] = useState<any>(null);
  const [attendanceActive, setAttendanceActive] = useState(false);
  const [sessionId, setSessionId] = useState("SESSION_INIT");

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<any>(null);

  // WebSocket Connection
  useEffect(() => {
    if (localStorage.getItem("role") !== "teacher") {
      window.location.href = "/";
      return;
    }
    const uid = localStorage.getItem("uid");

    if (uid) {

        fetch(`http://${window.location.hostname}:5000/teacher/profile/${uid}`)
            .then(res => res.json())
            .then(data => {
                setTeacher(data);
            })
            .catch(err => console.log(err));

    }

    const ws = new WebSocket(`ws://${window.location.hostname}:8080`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("✅ WebSocket Connected");
    };

    return () => {
      ws.close();
    };
  }, []);

  // Create QR Session
  const createSession = () => {
    const id = "SESSION_" + Date.now();
    const expiry = Date.now() + 3000;
    return `${id}|${expiry}`;
  };

  // Start Attendance
  const startSession = () => {
    if (!selectedDepartment || !selectedYear || !selectedSubject) {
      alert("⚠ Please select department, year and subject");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        console.log("📍 Teacher Location:", lat, lng);

        const sendSession = () => {
          const newSession = createSession();
          setSessionId(newSession);

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            const teacherUid = localStorage.getItem("uid");

            wsRef.current.send(
              JSON.stringify({
                type: "session",

                sessionId: newSession,

                teacher_uid: teacherUid,

                department: selectedDepartment,

                year: selectedYear,

                subject: selectedSubject,

                lat,

                lng,
              })
            );
          }
        };

        // Send immediately
        sendSession();

        // Update QR every 3 seconds
        intervalRef.current = setInterval(sendSession, 3000);
        setAttendanceActive(true);
      },
      () => {
        alert("❌ Location permission required to start attendance");
      }
    );
  };

  // Stop Attendance
  const stopSession = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setSessionId("SESSION_ENDED");
    setAttendanceActive(false);
  };

  const toggleSession = () => {
    if (!attendanceActive) {
      startSession();
    } else {
      stopSession();
    }
  };

  return (
    <>
      <header>
        <h1>Proxy-Resistant Smart Attendance System</h1>
      </header>

      <div className="container">
        {/* LEFT PANEL */}
        <div className="card">
          <h2>
              Welcome,
              <br />
              {teacher?.full_name || "Teacher"}
          </h2>

          <p>{teacher?.designation}</p>

          <p>{teacher?.department}</p>

          {/* Class */}
          <label>Select Department</label>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedYear("");
              setSelectedSubject("");
            }}
          >
            <option value="">Select Department</option>
            <option value="AIML">AIML</option>
            <option value="CSE">CSE</option>
          </select>

          <label>Select Year</label>
          <select
            value={selectedYear}
            disabled={!selectedDepartment}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedSubject("");
            }}
          >
            <option value="">Select Year</option>
            <option value="First Year">First Year</option>
            <option value="Second Year">Second Year</option>
            <option value="Third Year">Third Year</option>
            <option value="Final Year">Final Year</option>
          </select>

          {/* Subject */}
          <label>Select Subject</label>
          <select
            value={selectedSubject}
            disabled={!selectedYear}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Select Subject</option>

            {(departmentSubjects[selectedDepartment]?.[selectedYear] || []).map(
              (subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              )
            )}
          </select>

          {/* Start/Stop */}
          <button onClick={toggleSession}>
            {attendanceActive ? "Stop Attendance" : "Start Attendance"}
          </button>

          {/* Status */}
          <div className="status-box">
            <p>
              <strong>Status:</strong>{" "}
              {attendanceActive ? "Active" : "Inactive"}
            </p>
          </div>

          {/* Reports */}
          <button
              onClick={() => window.location.href="/teacher/attendance"}
          >
              View Attendance
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div className="card center">
          <h2>Live Session QR</h2>

          <p
            style={{
              fontSize: "12px",
              wordBreak: "break-all",
            }}
          >
            {sessionId}
          </p>

          {attendanceActive ? (
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                sessionId
              )}`}
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