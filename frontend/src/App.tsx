import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";

import Dashboard from "./pages/teacher/Dashboard";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";

import ScanQR from "./pages/student/ScanQR";
import Profile from "./pages/student/Profile";
import StudentAttendance from "./pages/student/StudentAttendance";

import AdminDashboard from "./pages/admin/Dashboard";

/* 🔐 Route Protection */
const PrivateRoute = ({ children, role }: any) => {
  const userRole = localStorage.getItem("role");

  // User is not logged in
  if (!userRole) {
    return <Navigate to="/" replace />;
  }

  // User does not have permission
  if (role && userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ================= LOGIN ================= */}
        <Route path="/" element={<Login />} />


        {/* ================= TEACHER ================= */}

        <Route
          path="/teacher"
          element={
            <PrivateRoute role="teacher">
              <Dashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/teacher/attendance"
          element={
            <PrivateRoute role="teacher">
              <TeacherAttendance />
            </PrivateRoute>
          }
        />


        {/* ================= STUDENT ================= */}

        <Route
          path="/profile"
          element={
            <PrivateRoute role="student">
              <Profile />
            </PrivateRoute>
          }
        />

        <Route
          path="/scan"
          element={
            <PrivateRoute role="student">
              <ScanQR />
            </PrivateRoute>
          }
        />

        <Route
          path="/student-attendance"
          element={
            <PrivateRoute role="student">
              <StudentAttendance />
            </PrivateRoute>
          }
        />


        {/* ================= ADMIN ================= */}

        <Route
          path="/admin"
          element={
            <PrivateRoute role="admin">
              <AdminDashboard />
            </PrivateRoute>
          }
        />


        {/* ================= INVALID ROUTE ================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;