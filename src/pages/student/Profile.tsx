import "../../styles/profile.css";

export default function Profile() {
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
          />

          <div className="profile-info">
            <h3>David Miller</h3>
            <p>Enrollment No: A124356</p>
          </div>
        </div>

        <div className="section">
          <h4>Attendance History</h4>

          <div className="row">
            <span>24-Apr-2024</span>
            <span className="present">Present</span>
          </div>

          <div className="row">
            <span>23-Apr-2024</span>
            <span className="absent">Absent</span>
          </div>
        </div>

        <div className="section">
          <h4>Update Profile Photo</h4>
          <button className="btn">Upload New Photo</button>
        </div>

      </div>
    </div>
  );
}