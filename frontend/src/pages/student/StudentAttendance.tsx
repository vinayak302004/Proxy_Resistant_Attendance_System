import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/attendance.css";
import { API_URL } from "../../config";

interface Attendance {
  subject: string;
  date: string;
  start_time: string;
  end_time: string;
  attendance_time: string;
  status: string;
}

export default function StudentAttendance() {
  const [selectedSubject, setSelectedSubject] = useState("");
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    present: 0,
    absent: 0,
    percentage: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const uid = localStorage.getItem("uid");
      const res = await fetch(`${API_URL}/student/attendance/${uid}`);
      const data = await res.json();

      if (data.success) {
        setAttendance(data.attendance);
        setSummary(data.summary);
      }
    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  const subjects = [...new Set(attendance.map((item) => item.subject))];

  const filteredAttendance =
    selectedSubject === ""
      ? attendance
      : attendance.filter((item) => item.subject === selectedSubject);

  const total = filteredAttendance.length;

  const present = filteredAttendance.filter(
    (item) => item.status === "Present"
  ).length;

  const absent = total - present;

  const percentage =
    total > 0 ? ((present / total) * 100).toFixed(2) : "0.00";

  return (
    <div className="attendance-page">
      {/* Header */}
      <div className="attendance-header">
        <div>
          <h1>Student Attendance</h1>
          <p>Proxy Resistant Smart Attendance System</p>
        </div>
        <button className="back-btn" onClick={() => navigate("/profile")}>
          ← Back
        </button>
      </div>

      {/* Filter Card */}
      <div className="filter-card">
        <div>
          <label>Subject</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">All Subjects</option>
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary */}
      <div className="summary-cards">
        <div className="summary-card">
          <h2>{total}</h2>
          <span>Total Lectures</span>
        </div>
        <div className="summary-card green">
          <h2>{present}</h2>
          <span>Present</span>
        </div>
        <div className="summary-card red">
          <h2>{absent}</h2>
          <span>Absent</span>
        </div>
        <div className="summary-card">
          <h2>{percentage}%</h2>
          <span>Attendance %</span>
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
                <th>Subject</th>
                <th>Date</th>
                <th>Lecture Time</th>
                <th>Attendance Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5}>No Attendance Found</td>
                </tr>
              ) : (
                filteredAttendance.map((item, index) => (
                  <tr key={index}>
                    <td>{item.subject}</td>
                    <td>{item.date}</td>
                    <td>
                      {item.start_time} - {item.end_time}
                    </td>
                    <td>{item.attendance_time}</td>
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