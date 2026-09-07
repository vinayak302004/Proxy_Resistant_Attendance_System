import { useState } from "react";
import "../../styles/admin.css";

import {
  getAuth
} from "firebase/auth";

import {
  initializeApp,
  getApps
} from "firebase/app";

import { API_URL } from "../../config";

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
  const adminName = localStorage.getItem("full_name") || "Admin";
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0] || null;
    setPhoto(file);
  };
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

  const handleAddStudent = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    setMessage("");
    if (
      !formData.prn ||
      !formData.full_name ||
      !formData.email ||
      !formData.password ||
      !formData.phone ||
      !formData.year ||
      !formData.branch ||
      !formData.division ||
      !photo
    ) {
      setMessage(
        "Please fill all required fields and select a student photo."
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
      const currentUser =
        auth.currentUser;
      if (!currentUser) {
        throw new Error(
          "Admin is not logged in."
        );
      }
      const token =
        await currentUser.getIdToken(
          true
        );
      const formDataToSend = new FormData();
      formDataToSend.append(
        "prn",
        formData.prn
      );
      formDataToSend.append(
        "full_name",
        formData.full_name
      );
      formDataToSend.append(
        "email",
        formData.email
      );
      formDataToSend.append(
        "password",
        formData.password
      );
      formDataToSend.append(
        "phone",
        formData.phone
      );
      formDataToSend.append(
        "year",
        formData.year
      );
      formDataToSend.append(
        "branch",
        formData.branch
      );
      formDataToSend.append(
        "division",
        formData.division
      );
      formDataToSend.append(
        "gender",
        formData.gender
      );
      formDataToSend.append(
        "photo",
        photo
      );
      const response =
        await fetch(
          `${API_URL}/api/students`,
          {
            method: "POST",
            headers: {
              "Authorization":
                `Bearer ${token}`
            },
            body:
              formDataToSend
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
      setMessage(
        "Student added successfully!"
      );
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
      setPhoto(null);
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
      <header className="admin-header">
        <h1>
          Proxy-Resistant Smart Attendance System
        </h1>
      </header>
      <main className="admin-container">
        <section className="admin-card">
          <h2>
            Welcome,
          </h2>
          <h2 className="admin-name">
            {adminName}
          </h2>
          <div className="admin-title">
            Add New Student
          </div>
          <form
            onSubmit={
              handleAddStudent
            }
          >
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
            <div className="admin-field">
              <label>
                Student Photo
                <span>*</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                disabled={loading}
                required
              />
              {photo && (
                <p className="selected-photo">
                  Selected: {photo.name}
                </p>
              )}
            </div>
            {message && (
              <div className="admin-message">
                {message}
              </div>
            )}
            <button
              type="submit"
              className="admin-add-btn"
              disabled={loading}
            >
              {
                loading
                  ? "Adding Student..."
                  : "Add Student"
              }
            </button>
          </form>
          <button
            className="admin-logout-btn"
            onClick={logout}
            disabled={loading}
          >
            Logout
          </button>
        </section>
      </main>
    </div>
  );
}