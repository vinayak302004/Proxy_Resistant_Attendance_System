import { useState } from "react";
import "../../styles/login.css";

import {
  initializeApp
} from "firebase/app";

import {
  getAuth,
  signInWithEmailAndPassword
} from "firebase/auth";

import { API_URL } from "../../config";


const firebaseConfig = {
  apiKey: "AIzaSyDsJPGm7CwJEE2o2kI0NAiSKia0YQxEvMs",
  authDomain: "smart-attendance-login.firebaseapp.com",
  projectId: "smart-attendance-login",
  storageBucket: "smart-attendance-login.firebasestorage.app",
  messagingSenderId: "198869708642",
  appId: "1:198869708642:web:b762ec97baf3bb9c97863b"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);


export default function Login() {

  const [role, setRole] = useState("teacher");

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [msg, setMsg] = useState("");

  const [loading, setLoading] = useState(false);


  const login = async () => {

    setMsg("");


    if (!email || !password) {

      setMsg(
        "Please enter email and password"
      );

      return;
    }


    setLoading(true);


    try {

      // =================================================
      // STEP 1
      // Firebase Authentication
      // =================================================

      const cred =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );


      console.log(
        "Firebase authentication successful"
      );


      // =================================================
      // STEP 2
      // Get Firebase ID Token
      // =================================================

      const token =
        await cred.user.getIdToken();


      // =================================================
      // STEP 3
      // Ask Flask/MySQL for application data
      // =================================================

      const response =
        await fetch(
          `${API_URL}/api/auth/login`,
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",

              "Authorization":
                `Bearer ${token}`

            },

            body:
              JSON.stringify({

                email:
                  cred.user.email || email,

                role:
                  role

              })

          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(

          data.message ||
          "Account not found in MySQL."

        );

      }


      // =================================================
      // STUDENT
      // =================================================

      if (role === "student") {

        const student =
          data.student;


        if (!student || !student.prn) {

          throw new Error(
            "Student PRN was not returned by server."
          );

        }


        // Store application identity
        localStorage.setItem(
          "role",
          "student"
        );


        localStorage.setItem(
          "prn",
          student.prn
        );


        localStorage.setItem(
          "email",
          student.email
        );


        localStorage.setItem(
          "full_name",
          student.full_name
        );


        console.log(
          "Student logged in:",
          student.prn
        );


        window.location.href =
          "/profile";

        return;
      }


      // =================================================
      // TEACHER
      // =================================================

      if (role === "teacher") {

        const teacher =
          data.teacher;


        if (
          !teacher ||
          !teacher.teacher_id
        ) {

          throw new Error(
            "Teacher ID was not returned by server."
          );

        }


        localStorage.setItem(
          "role",
          "teacher"
        );


        localStorage.setItem(
          "teacher_id",
          teacher.teacher_id
        );


        localStorage.setItem(
          "email",
          teacher.email
        );


        localStorage.setItem(
          "full_name",
          teacher.full_name
        );


        window.location.href =
          "/teacher";

        return;
      }


      // =================================================
      // ADMIN
      // =================================================

      if (role === "admin") {

        const admin =
          data.admin;


        if (
          !admin ||
          !admin.admin_id
        ) {

          throw new Error(
            "Admin ID was not returned by server."
          );

        }


        localStorage.setItem(
          "role",
          "admin"
        );


        localStorage.setItem(
          "admin_id",
          admin.admin_id
        );


        localStorage.setItem(
          "email",
          admin.email
        );


        localStorage.setItem(
          "full_name",
          admin.full_name
        );


        window.location.href =
          "/admin";

        return;
      }


    } catch (err: any) {

      console.error(
        "Login error:",
        err
      );


      setMsg(
        err?.message ||
        "Login failed. Please check your credentials."
      );


      setLoading(false);
    }

  };


  return (

    <div className="login-box">

      <h2>
        Proxy-Resistant Smart Attendance System
      </h2>


      {/* =====================================
          ROLE TABS
      ===================================== */}

      <div className="tabs">

        <button
          type="button"
          className={
            role === "teacher"
              ? "active"
              : ""
          }
          onClick={() => {

            setRole("teacher");

            setMsg("");

          }}
        >
          Teacher Login
        </button>


        <button
          type="button"
          className={
            role === "student"
              ? "active"
              : ""
          }
          onClick={() => {

            setRole("student");

            setMsg("");

          }}
        >
          Student Login
        </button>


        <button
          type="button"
          className={
            role === "admin"
              ? "active"
              : ""
          }
          onClick={() => {

            setRole("admin");

            setMsg("");

          }}
        >
          Admin Login
        </button>

      </div>


      {/* =====================================
          EMAIL
      ===================================== */}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        disabled={loading}
      />


      {/* =====================================
          PASSWORD
      ===================================== */}

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        disabled={loading}
      />


      {/* =====================================
          LOGIN
      ===================================== */}

      <button
        type="button"
        className="login-btn"
        onClick={login}
        disabled={loading}
      >

        {
          loading
            ? "Please wait..."
            : "Login"
        }

      </button>


      {loading && (

        <div className="loading">

          <p>
            Authenticating...
          </p>

        </div>

      )}


      {msg && (

        <p className="login-message">

          {msg}

        </p>

      )}

    </div>

  );
}