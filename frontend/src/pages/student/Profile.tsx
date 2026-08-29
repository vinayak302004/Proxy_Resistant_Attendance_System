import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import "../../styles/profile.css";

import { API_URL } from "../../config";


interface Student {

  full_name: string;

  prn: string;

  email: string;

  phone: string;

  year: string;

  branch: string;

  division: string;

  gender: string;

  face_folder: string;

}


export default function Profile() {

  const navigate =
    useNavigate();


  const [
    student,
    setStudent
  ] = useState<Student | null>(null);


  const [
    loading,
    setLoading
  ] = useState(true);


  const [
    error,
    setError
  ] = useState("");


  useEffect(() => {

    const loadProfile =
      async () => {

        try {

          // =========================================
          // Get PRN from localStorage
          // =========================================

          const prn =
            localStorage.getItem("prn");


          console.log(
            "Logged-in student PRN:",
            prn
          );


          if (!prn) {

            setError(
              "Student PRN not found. Please login again."
            );

            setLoading(false);

            return;
          }


          // =========================================
          // Request profile using PRN
          // =========================================

          const response =
            await fetch(
              `${API_URL}/student/profile/${encodeURIComponent(prn)}`
            );


          const data =
            await response.json();


          console.log(
            "Profile API response:",
            data
          );


          if (!response.ok) {

            throw new Error(

              data.message ||
              "Student profile not found."

            );

          }


          setStudent(data);

          setLoading(false);

        }

        catch (err: any) {

          console.error(
            "Profile error:",
            err
          );


          setError(
            err?.message ||
            "Unable to load student profile."
          );


          setLoading(false);

        }

      };


    loadProfile();

  }, []);


  // =========================================
  // Scanner
  // =========================================

  const openScanner = () => {

    navigate("/scan");

  };


  // =========================================
  // Logout
  // =========================================

  const logout = () => {

    localStorage.removeItem("role");

    localStorage.removeItem("prn");

    localStorage.removeItem("email");

    localStorage.removeItem("full_name");

    window.location.href = "/";

  };


  // =========================================
  // Loading
  // =========================================

  if (loading) {

    return (

      <div className="wrapper">

        <h2>
          Loading Profile...
        </h2>

      </div>

    );

  }


  // =========================================
  // Error
  // =========================================

  if (!student) {

    return (

      <div className="wrapper">

        <div className="card">

          <div className="card-header">

            <span>
              Student Profile
            </span>

          </div>


          <div className="section center">

            <h2>
              Student Profile Not Found
            </h2>


            <p>
              {error}
            </p>


            <button
              className="btn"
              onClick={() =>
                window.location.href = "/"
              }
            >
              Login Again
            </button>

          </div>

        </div>

      </div>

    );

  }


  // =========================================
  // Profile UI
  // =========================================

  return (

    <div className="wrapper">

      <div className="card">


        {/* =================================
            HEADER
        ================================= */}

        <div className="card-header">

          <span>
            Student Profile
          </span>

        </div>


        {/* =================================
            PROFILE
        ================================= */}

        <div className="profile-banner">

          <img
            src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
            className="profile-img"
            alt="Student"
          />


          <div className="profile-info">

            <h3>
              {student.full_name}
            </h3>


            <p>
              <b>PRN:</b>{" "}
              {student.prn}
            </p>


            <p>
              <b>Phone:</b>{" "}
              {student.phone}
            </p>


            <p>
              <b>Year:</b>{" "}
              {student.year}
            </p>


            <p>
              <b>Branch:</b>{" "}
              {student.branch}
            </p>


            <p>
              <b>Division:</b>{" "}
              {student.division}
            </p>

          </div>

        </div>


        {/* =================================
            QR SCANNER
        ================================= */}

        <div className="section center">

          <button
            className="btn"
            onClick={openScanner}
          >

            📷 Scan QR for Attendance

          </button>

        </div>


        {/* =================================
            ATTENDANCE
        ================================= */}

        <div className="section">

          <button
            className="btn"
            onClick={() =>
              navigate(
                "/student-attendance"
              )
            }
          >

            📊 View Attendance

          </button>

        </div>


        {/* =================================
            PROFILE PHOTO
        ================================= */}

        <div className="section">

          <h4>
            Update Profile Photo
          </h4>


          <button
            className="btn"
            disabled
          >
            Upload New Photo
          </button>

        </div>


        {/* =================================
            LOGOUT
        ================================= */}

        <div className="section">

          <button
            className="btn"
            onClick={logout}
          >
            Logout
          </button>

        </div>


      </div>

    </div>

  );

}