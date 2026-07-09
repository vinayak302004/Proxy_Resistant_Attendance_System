import { useEffect, useState } from "react";
import "../../styles/profile.css";
import { API_URL } from "../../config"; // Adjust path if needed

interface Student {
  full_name: string;
  prn: string;
  email: string;
  year: string;
  branch: string;
  division: string;
  face_folder: string;
}

export default function Profile() {

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const uid = localStorage.getItem("uid");

    if (!uid) {
      alert("User not logged in");
      return;
    }

    fetch(`${API_URL}/student/profile/${uid}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Student not found");
        }
        return res.json();
      })
      .then((data) => {
        setStudent(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });

  }, []);

  const openScanner = () => {
    window.location.href = "/scan";
  };

  if (loading) {
    return (
      <div className="wrapper">
        <h2>Loading Profile...</h2>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="wrapper">
        <h2>Student Not Found</h2>
      </div>
    );
  }

  return (
    <div className="wrapper">
      <div className="card">

        <div className="card-header">
          <span>Student Profile</span>
        </div>

        <div className="profile-banner">

          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            className="profile-img"
            alt="Student"
          />

          <div className="profile-info">
            <h3>{student.full_name}</h3>
            <p><b>PRN:</b> {student.prn}</p>
            <p><b>Email:</b> {student.email}</p>
            <p><b>Year:</b> {student.year}</p>
            <p><b>Branch:</b> {student.branch}</p>
            <p><b>Division:</b> {student.division}</p>
          </div>
        </div>

        <div className="section center">
          <button className="btn" onClick={openScanner}>
            📷 Scan QR for Attendance
          </button>
        </div>

        <div className="section">
          <button
              className="btn"
              onClick={() => window.location.href="/student/attendance"}
          >
              📊 View Attendance
          </button>
        </div>

        <div className="section">
          <h4>Update Profile Photo</h4>

          <button className="btn">
            Upload New Photo
          </button>
        </div>

      </div>
    </div>
  );
}