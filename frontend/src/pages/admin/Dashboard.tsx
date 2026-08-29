import { useState } from "react";

import "../../styles/admin.css";

import {
  getAuth
} from "firebase/auth";

import {
  initializeApp,
  getApps
} from "firebase/app";


const firebaseConfig = {

  apiKey:
    "AIzaSyDsJPGm7CwJEE2o2kI0NAiSKia0YQxEvMs",

  authDomain:
    "smart-attendance-login.firebaseapp.com",

  projectId:
    "smart-attendance-login",

  storageBucket:
    "smart-attendance-login.firebasestorage.app",

  messagingSenderId:
    "198869708642",

  appId:
    "1:198869708642:web:b762ec97baf3bb9c97863b6"

};


const app =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp(firebaseConfig);

const auth = getAuth(app);


export default function AdminDashboard() {

  const [formData, setFormData] =
    useState({

      prn: "",

      full_name: "",

      email: "",

      password: "",

      phone: "",

      year: "",

      branch: "",

      division: "",

      gender: "",

      face_folder: ""

    });


  const [loading, setLoading] =
    useState(false);


  const [message, setMessage] =
    useState("");


  const handleChange = (

    e: React.ChangeEvent<
      HTMLInputElement |
      HTMLSelectElement
    >

  ) => {

    setFormData({

      ...formData,

      [e.target.name]:
        e.target.value

    });

  };


  // =======================================
  // Add Student
  // =======================================

  const handleAddStudent = async (

    e: React.FormEvent<HTMLFormElement>

  ) => {

    e.preventDefault();

    setMessage("");


    // =====================================
    // Validation
    // =====================================

    if (

      !formData.prn ||

      !formData.full_name ||

      !formData.email ||

      !formData.password ||

      !formData.phone ||

      !formData.year ||

      !formData.branch ||

      !formData.division

    ) {

      setMessage(
        "Please fill all required fields."
      );

      return;

    }


    if (
      formData.password.length < 6
    ) {

      setMessage(
        "Password must contain at least 6 characters."
      );

      return;

    }


    try {

      setLoading(true);


      // =====================================
      // Firebase Current Admin
      // =====================================

      const currentUser =
        auth.currentUser;


      if (!currentUser) {

        throw new Error(
          "Admin is not logged in."
        );

      }


      // =====================================
      // Firebase ID Token
      // =====================================

      const token =
        await currentUser.getIdToken(
          true
        );


      // =====================================
      // Send To Flask
      // =====================================

      const response =
        await fetch(
          "http://localhost:5000/api/students",
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${token}`

            },

            body:
              JSON.stringify(
                formData
              )

          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(

          data.message ||
          "Failed to add student."

        );

      }


      // =====================================
      // Success
      // =====================================

      setMessage(
        "Student added successfully!"
      );


      // =====================================
      // Clear Form
      // =====================================

      setFormData({

        prn: "",

        full_name: "",

        email: "",

        password: "",

        phone: "",

        year: "",

        branch: "",

        division: "",

        gender: "",

        face_folder: ""

      });

    }

    catch (error: any) {

      console.error(
        "Add student error:",
        error
      );

      setMessage(

        error?.message ||
        "Unable to connect to server."

      );

    }

    finally {

      setLoading(false);

    }

  };


  // =======================================
  // Logout
  // =======================================

  const logout = async () => {

    try {

      await auth.signOut();

    }

    catch (error) {

      console.error(
        "Logout error:",
        error
      );

    }

    localStorage.clear();

    window.location.href = "/";

  };


  return (

    <div className="admin-page">


      {/* =================================
          HEADER
      ================================= */}

      <header className="admin-header">

        <h1>
          Proxy-Resistant Smart Attendance System
        </h1>

      </header>


      {/* =================================
          MAIN
      ================================= */}

      <main className="admin-container">


        {/* =================================
            LEFT CARD
        ================================= */}

        <section className="admin-card">

          <h2>
            Welcome,
          </h2>

          <h2 className="admin-name">
            Admin
          </h2>


          <div className="admin-title">
            Add New Student
          </div>


          <form
            onSubmit={
              handleAddStudent
            }
          >


            {/* PRN */}

            <div className="admin-field">

              <label>

                PRN
                <span>*</span>

              </label>

              <input

                type="text"

                name="prn"

                value={
                  formData.prn
                }

                onChange={
                  handleChange
                }

                placeholder="Enter PRN"

                required

                disabled={loading}

              />

            </div>


            {/* FULL NAME */}

            <div className="admin-field">

              <label>

                Full Name
                <span>*</span>

              </label>

              <input

                type="text"

                name="full_name"

                value={
                  formData.full_name
                }

                onChange={
                  handleChange
                }

                placeholder="Enter student name"

                required

                disabled={loading}

              />

            </div>


            {/* EMAIL */}

            <div className="admin-field">

              <label>

                Email
                <span>*</span>

              </label>

              <input

                type="email"

                name="email"

                value={
                  formData.email
                }

                onChange={
                  handleChange
                }

                placeholder="student@gmail.com"

                required

                disabled={loading}

              />

            </div>


            {/* PASSWORD */}

            <div className="admin-field">

              <label>

                Student Password
                <span>*</span>

              </label>

              <input

                type="password"

                name="password"

                value={
                  formData.password
                }

                onChange={
                  handleChange
                }

                placeholder="Minimum 6 characters"

                required

                disabled={loading}

              />

            </div>


            {/* PHONE */}

            <div className="admin-field">

              <label>

                Phone
                <span>*</span>

              </label>

              <input

                type="tel"

                name="phone"

                value={
                  formData.phone
                }

                onChange={
                  handleChange
                }

                placeholder="Enter phone number"

                required

                disabled={loading}

              />

            </div>


            {/* YEAR */}

            <div className="admin-field">

              <label>

                Select Year
                <span>*</span>

              </label>

              <select

                name="year"

                value={
                  formData.year
                }

                onChange={
                  handleChange
                }

                required

                disabled={loading}

              >

                <option value="">
                  Select Year
                </option>

                <option value="First Year">
                  First Year
                </option>

                <option value="Second Year">
                  Second Year
                </option>

                <option value="Third Year">
                  Third Year
                </option>

                <option value="Final Year">
                  Final Year
                </option>

              </select>

            </div>


            {/* DEPARTMENT */}

            <div className="admin-field">

              <label>

                Select Department
                <span>*</span>

              </label>

              <select

                name="branch"

                value={
                  formData.branch
                }

                onChange={
                  handleChange
                }

                required

                disabled={loading}

              >

                <option value="">
                  Select Department
                </option>

                <option value="AIML">
                  AIML
                </option>

                <option value="CSE">
                  CSE
                </option>

                <option value="ENTC">
                  ENTC
                </option>

                <option value="Mechanical">
                  Mechanical
                </option>

                <option value="Civil">
                  Civil
                </option>

              </select>

            </div>


            {/* DIVISION */}

            <div className="admin-field">

              <label>

                Select Division
                <span>*</span>

              </label>

              <select

                name="division"

                value={
                  formData.division
                }

                onChange={
                  handleChange
                }

                required

                disabled={loading}

              >

                <option value="">
                  Select Division
                </option>

                <option value="A">
                  A
                </option>

                <option value="B">
                  B
                </option>

                <option value="C">
                  C
                </option>

                <option value="D">
                  D
                </option>

              </select>

            </div>


            {/* GENDER */}

            <div className="admin-field">

              <label>
                Gender
              </label>

              <select

                name="gender"

                value={
                  formData.gender
                }

                onChange={
                  handleChange
                }

                disabled={loading}

              >

                <option value="">
                  Select Gender
                </option>

                <option value="Male">
                  Male
                </option>

                <option value="Female">
                  Female
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </div>


            {/* FACE FOLDER */}

            <div className="admin-field">

              <label>
                Face Folder
              </label>

              <input

                type="text"

                name="face_folder"

                value={
                  formData.face_folder
                }

                onChange={
                  handleChange
                }

                placeholder="Example: faces/230701001"

                disabled={loading}

              />

            </div>


            {/* MESSAGE */}

            {message && (

              <div className="admin-message">

                {message}

              </div>

            )}


            {/* ADD BUTTON */}

            <button

              type="submit"

              className="admin-add-btn"

              disabled={loading}

            >

              {
                loading
                  ? "Creating Student..."
                  : "Add Student"
              }

            </button>


          </form>


          {/* LOGOUT */}

          <button

            className="admin-logout-btn"

            onClick={logout}

            disabled={loading}

          >

            Logout

          </button>

        </section>


        {/* =================================
            RIGHT CARD
        ================================= */}

        <section
          className="admin-card admin-info-card"
        >

          <h2>
            Student Management
          </h2>


          <p className="admin-description">

            Create student accounts using
            Firebase Authentication and store
            student academic information in MySQL.

          </p>


          <div className="admin-info-box">

            <h3>
              Firebase Authentication
            </h3>

            <p>

              Firebase Authentication securely
              creates and manages the student's
              email and password account.

            </p>

          </div>


          <div className="admin-info-box">

            <h3>
              PRN-Based Student Identity
            </h3>

            <p>

              PRN is the unique identifier for
              students in the MySQL database.

            </p>

          </div>


          <div className="admin-info-box">

            <h3>
              MySQL Database
            </h3>

            <p>

              Student academic and personal
              information is stored directly
              in the MySQL students table.

            </p>

          </div>


          <div className="admin-info-box">

            <h3>
              Face Recognition
            </h3>

            <p>

              The student's face folder is
              associated with their PRN for
              face enrollment and verification.

            </p>

          </div>


          <div className="admin-status">

            <strong>
              System Status:
            </strong>

            <span>
              Admin Panel Active
            </span>

          </div>

        </section>

      </main>

    </div>

  );

}