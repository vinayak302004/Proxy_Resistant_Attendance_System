import { useState } from "react";
import "../../styles/login.css";
import RITLogo from "../../assets/RIT_logo.jpeg";

import { initializeApp } from "firebase/app";

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
  appId: "1:198869708642:web:b762ec97baf3bb9c97863b6"
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
      setMsg("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("Firebase authentication successful");

      const token = await cred.user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            email: cred.user.email || email,
            role: role
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Account not found in MySQL."
        );
      }

      if (role === "student") {
        const student = data.student;

        if (!student || !student.prn) {
          throw new Error(
            "Student PRN was not returned by server."
          );
        }

        localStorage.setItem("role", "student");
        localStorage.setItem("prn", student.prn);
        localStorage.setItem("email", student.email);
        localStorage.setItem("full_name", student.full_name);

        console.log("Student logged in:", student.prn);

        window.location.href = "/profile";

        return;
      }

      if (role === "teacher") {
        const teacher = data.teacher;

        if (
          !teacher ||
          !teacher.teacher_id
        ) {
          throw new Error(
            "Teacher ID was not returned by server."
          );
        }

        localStorage.setItem("role", "teacher");
        localStorage.setItem(
          "teacher_id",
          teacher.teacher_id
        );
        localStorage.setItem("email", teacher.email);
        localStorage.setItem(
          "full_name",
          teacher.full_name
        );

        window.location.href = "/teacher";

        return;
      }

      if (role === "admin") {
        const admin = data.admin;

        if (
          !admin ||
          !admin.admin_id
        ) {
          throw new Error(
            "Admin ID was not returned by server."
          );
        }

        localStorage.setItem("role", "admin");
        localStorage.setItem(
          "admin_id",
          admin.admin_id
        );
        localStorage.setItem("email", admin.email);
        localStorage.setItem(
          "full_name",
          admin.full_name
        );

        window.location.href = "/admin";

        return;
      }
    } catch (err: any) {
      console.error("Login error:", err);

      setMsg(
        err?.message ||
        "Login failed. Please check your credentials."
      );

      setLoading(false);
    }
  };

  return (
    <div className="login-box">
      <div className="login-header">
        <img
          src={RITLogo}
          alt="RIT Logo"
          className="rit-logo"
        />

        <h2>
          Proxy-Resistant Smart Attendance System
        </h2>
      </div>

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

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) =>
          setEmail(e.target.value)
        }
        disabled={loading}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
        disabled={loading}
      />

      <button
        type="button"
        className="login-btn"
        onClick={login}
        disabled={loading}
      >
        {loading
          ? "Please wait..."
          : "Login"}
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