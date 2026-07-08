import { useEffect, useState } from "react";
import "../../styles/profile.css";

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

    fetch(`http://localhost:5000/student/profile/${uid}`)
      .then(res => res.json())
      .then(data => {
        setStudent(data);
        setLoading(false);
      })
      .catch(err => {
        console.log(err);
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
          <div>🔔 ⚙ ⬜</div>
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

        <div className="section">
          <h4>Attendance History</h4>

          <div className="row">
            <span>Attendance Module Coming Soon</span>
          </div>
        </div>

        <div className="section center">
          <button className="btn" onClick={openScanner}>
            📷 Scan QR for Attendance
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