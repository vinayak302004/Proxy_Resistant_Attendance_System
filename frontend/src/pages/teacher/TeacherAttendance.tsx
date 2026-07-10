import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/attendance.css";
import { API_URL } from "../../config";

export default function TeacherAttendance() {
  const navigate = useNavigate();

  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const teacherUid = localStorage.getItem("uid");

      const res = await fetch(
        `${API_URL}/attendance/all?teacher_uid=${teacherUid}`
      );

      const data = await res.json();

        setAttendance(data || []);

        if (data.length > 0) {

        setSelectedSubject(data[0].subject);

        setSelectedDate(data[0].attendance_date);

        }

    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  const subjects = useMemo(() => {

    return [
        ...new Set(
        attendance.map((a) => a.subject)
        )
    ];

    }, [attendance]);

  const dates = useMemo(() => {

    return [
        ...new Set(
        attendance
            .filter(
            (a) => a.subject === selectedSubject
            )
            .map(
            (a) => a.attendance_date
            )
        )
    ];

    }, [attendance, selectedSubject]);

  const filtered =
    attendance.length > 0
        ? attendance.filter(
            (a) =>
            a.subject === selectedSubject &&
            a.attendance_date === selectedDate
        )
        : [
            {
            prn: "2317049",
            student_name: "Vinayak Dhulubulu",
            department: "AIML",
            year: "Final Year",
            status: "Present",
            attendance_time: "12:19:47",
            },
            {
            prn: "2467001",
            student_name: "Atharvr Kadam",
            department: "AIML",
            year: "Final Year",
            status: "Present",
            attendance_time: "12:20:10",
            },
        ];

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

      <div className="filter-card">

        <div>

          <label>Subject</label>

          <select
            value={selectedSubject}
            onChange={(e) => {

                const subject = e.target.value;

                setSelectedSubject(subject);

                const first = attendance.find(
                (x) => x.subject === subject
                );

                setSelectedDate(first?.attendance_date || "");

            }}
            >

            <option value="">
            Select Subject
            </option>

            {
            subjects.map((subject)=>(
            <option key={subject} value={subject}>
                {subject}
            </option>
            ))
            }

            </select>

        </div>

        <div>

          <label>Date</label>

          <select
            value={selectedDate}
            onChange={(e)=>setSelectedDate(e.target.value)}
            >

            <option value="">
            Select Date
            </option>

            {
            dates.map((date)=>(
            <option key={date} value={date}>
                {date}
            </option>
            ))
            }

            </select>

        </div>

      </div>

      <div className="summary-cards">

        {selectedSubject && selectedDate && (
        <>
            <div className="summary-cards">

            <div className="summary-card">
                <h2>{filtered.length}</h2>
                <span>Total Students</span>
            </div>

            <div className="summary-card green">
                <h2>
                {filtered.filter((x) => x.status === "Present").length}
                </h2>
                <span>Present</span>
            </div>

            <div className="summary-card red">
                <h2>
                {filtered.filter((x) => x.status === "Absent").length}
                </h2>
                <span>Absent</span>
            </div>

            </div>

            <div className="table-card">

            {loading ? (
                <h2>Loading...</h2>
            ) : (
                <table>

                <thead>
                    <tr>
                    <th>PRN</th>
                    <th>Name</th>
                    <th>Department</th>
                    <th>Year</th>
                    <th>Status</th>
                    <th>Time</th>
                    </tr>
                </thead>

                <tbody>

                    {filtered.length === 0 ? (
                    <tr>
                        <td colSpan={6}>
                        No Attendance Found
                        </td>
                    </tr>
                    ) : (
                    filtered.map((item, i) => (
                        <tr key={i}>
                        <td>{item.prn}</td>
                        <td>{item.student_name}</td>
                        <td>{item.department}</td>
                        <td>{item.year}</td>

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
        </>
        )}

        {(!selectedSubject || !selectedDate) && (
        <div
            style={{
            marginTop: "40px",
            padding: "50px",
            background: "#fff",
            borderRadius: "12px",
            textAlign: "center",
            color: "#777",
            fontSize: "18px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.08)"
            }}
        >
            📚 Please select a <strong>Subject</strong> and <strong>Date</strong> to view attendance.
        </div>
        )}

      </div>

    </div>
  );
}