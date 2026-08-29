import { useEffect, useState, useRef } from "react";
import "../../styles/dashboard.css";
import { useNavigate } from "react-router-dom";

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
  const [sessionId, setSessionId] = useState("");
  const [qrToken, setQrToken] = useState("");
  const [liveAttendance, setLiveAttendance] = useState<any[]>([]);
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");

  const intervalRef = useRef<any>(null);
  const liveIntervalRef = useRef<any>(null);

  const navigate = useNavigate();

  // Load Teacher Profile
useEffect(() => {
  if (localStorage.getItem("role") !== "teacher") {
    window.location.href = "/";
    return;
  }

  const teacherId = localStorage.getItem("teacher_id");

  if (teacherId) {
    fetch(
      `http://${window.location.hostname}:5000/teacher/profile/${teacherId}`
    )
      .then((res) => res.json())
      .then((data) => {
        setTeacher(data);
      })
      .catch((err) => {
        console.error("Failed to load teacher profile:", err);
      });
  }

  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
    }
  };
}, []);

  // Start Attendance
const startSession = () => {
  if (!selectedDepartment || !selectedYear || !selectedSubject) {
    alert("⚠ Please select department, year and subject");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      try {
        const teacherId = localStorage.getItem("teacher_id");

        if (!teacherId) {
          alert("❌ Teacher ID not found. Please login again.");
          return;
        }

        const response = await fetch(
          `http://${window.location.hostname}:5000/attendance/start`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              teacher_id: teacherId,
              department: selectedDepartment,
              year: selectedYear,
              subject: selectedSubject,
              lat,
              lng,
            }),
          }
        );

        const result = await response.json();

        if (!result.success) {
          alert(result.message || "Failed to start attendance");
          return;
        }

        let currentSession = result.session_id;
        let currentQrToken = result.qr_token;

        setSessionId(currentSession);
        setQrToken(currentQrToken);

        setSessionInfo({
            subject: selectedSubject,
            department: selectedDepartment,
            year: selectedYear,
            start_time: new Date().toLocaleTimeString(),
        });

        // Refresh session every 3 seconds
        intervalRef.current = setInterval(async () => {
          try {
              const res = await fetch(
                  `http://${window.location.hostname}:5000/attendance/refresh`,
                  {
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                          session_id: currentSession,
                      }),
                  }
              );

              const data = await res.json();

              if (!data.success) {
                  clearInterval(intervalRef.current);
                  setAttendanceActive(false);
                  setSessionId("SESSION_ENDED");
                  return;
              }

              if (data.session_id) {
                  currentSession = data.session_id;
                  setSessionId(currentSession);
              }

              if (data.qr_token) {

                  console.log("OLD TOKEN :", currentQrToken);
                  console.log("NEW TOKEN :", data.qr_token);

                  currentQrToken = data.qr_token;

                  setQrToken(data.qr_token);
              }

          } catch (err) {
              console.error("Refresh Error:", err);
          }
      }, 8000);

        setAttendanceActive(true);
        setLiveAttendance([]);

        liveIntervalRef.current = setInterval(async () => {
            console.log("Refreshing QR...");
            try {

              const res = await fetch(
                  `http://${window.location.hostname}:5000/attendance/live/${currentSession}`
              );

              if (!res.ok) {
                  clearInterval(liveIntervalRef.current);
                  liveIntervalRef.current = null;
                  return;
              }

              const data = await res.json();

              if (data.success) {
                  setSessionInfo(data.session);
                  setLiveAttendance(data.students);
              } else {
                  clearInterval(liveIntervalRef.current);
                  liveIntervalRef.current = null;
              }

          } catch (err) {
              clearInterval(liveIntervalRef.current);
              liveIntervalRef.current = null;
          }

        }, 2000);

      } catch (err) {
        console.error(err);
        alert("❌ Failed to start attendance");
      }
    },
    () => {
      alert("❌ Location permission required.");
    }
  );
};

const stopSession = async () => {
  if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
  }

  if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
  }

  try {
    await fetch(
      `http://${window.location.hostname}:5000/attendance/stop`,
      {
        method: "POST",
      }
    );
  } catch (err) {
    console.log(err);
  }
  setLiveAttendance([]);
  setAttendanceActive(false);
  setSessionInfo(null);
  setQrToken("");
  setSessionId("SESSION_ENDED");
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
              onClick={() => navigate("/teacher/attendance")}
          >
              View Attendance
          </button>
        </div>


        {/* RIGHT PANEL */}
        <div className="card center">
          <h2>Live Session QR</h2>

          {attendanceActive && sessionInfo && (
              <div
                  style={{
                      background: "#f8fbff",
                      padding: "12px",
                      borderRadius: "10px",
                      marginBottom: "15px",
                      textAlign: "left",
                  }}
              >
                  <p>
                      <strong>Subject:</strong> {sessionInfo.subject}
                  </p>

                  <p>
                      <strong>Department:</strong> {sessionInfo.department}
                  </p>

                  <p>
                      <strong>Year:</strong> {sessionInfo.year}
                  </p>

                  <p>
                      <strong>Started:</strong> {sessionInfo.start_time}
                  </p>
              </div>
          )}

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
              src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrToken)}&t=${Date.now()}`}
              alt="QR Code"
            />
            
          ) : (
            <p style={{ color: "gray" }}>Session not active</p>
          )}
          <div
    style={{
        marginTop: "20px",
        width: "100%"
    }}
>

    <div
        style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
        }}
    >

        <h3>Live Attendance</h3>

        <strong>

            Present : {liveAttendance.length}

        </strong>

    </div>

    <table
        style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "14px"
        }}
    >

        <thead>

            <tr>

                <th>PRN</th>

                <th>Name</th>

                <th>Time</th>

            </tr>

        </thead>

        <tbody>

        {liveAttendance.length === 0 ? (

            <tr>

                <td colSpan={3}>
                    Waiting for students...
                </td>

            </tr>

        ) : (

            liveAttendance.map((student, index) => (

                <tr key={index}>

                    <td>{student.prn}</td>

                    <td>{student.student_name}</td>

                    <td>{student.attendance_time}</td>

                </tr>

            ))

        )}

        </tbody>

    </table>

</div>
        </div>
      </div>
    </>
  );
}