# Proxy-Resistant Real-Time QR-Based Smart Attendance System

---

## **Problem Statement**

Traditional attendance systems like **manual roll calls**, **paper registers**, and **static QR-based solutions** are **time-consuming, error-prone**, and **vulnerable to proxy attendance**.

**Goal:**  
Develop a **secure, real-time, web-based attendance system** that:  

- **Prevents proxy attendance**  
- **Ensures attendance is recorded only by physically present and authenticated students**

---

## **Objectives**

- **Eliminate proxy attendance** with multi-layer verification  
- **Automate attendance recording** to reduce manual effort for faculty  
- **Provide a cost-effective, hardware-independent, scalable solution**  
- **Enhance transparency and accountability** in educational institutions  

---

## **System Architecture**

The system workflow is divided into key modules:  

- **User Authentication Module** – Role-based login for students and faculty  
- **Dynamic QR Code Module** – Generates session-specific QR codes with automatic expiry  
- **QR Scanning Module** – First-level attendance validation  
- **Live Camera Verification Module** – Facial recognition and liveness detection  
- **GPS Location Validation Module** – Geo-fencing ensures on-campus presence  
- **Attendance Management Module** – Secure storage and duplicate prevention  
- **Admin Dashboard Module** – Real-time monitoring, reporting, and export features  

---

## **Screenshots**

### **Login Page**

![Login Page](screenshots\Login.png)

---

### **Teacher Dashboard**

![Teacher Dashboard](screenshots/Teacher.png)

---

### **Teacher Attendance Dashboard**

![Teacher Attendance Dashboard 1](screenshots/Teacher_Attendance_Dashboard1.png)

![Teacher Attendance Dashboard 2](screenshots/Teacher_Attendance_Dashboard2.png)

---

### **Apply Leave**

![Apply Leave](screenshots/Leave_Apply.png)

---

### **Monthly Attendace List**

![Monthly Attendance List](screenshots/Monthly_Attendance_Report.png)

---

### **Defaulter List**

![Defaulter List](screenshots/Defaulter_Report.png)

---

### **Student Dashboard**

![Student Dashboard](screenshots/Student.png)

---

### **Student Attendance Dashboard**

![Student Attendance Dashboard](screenshots/Student_Attendance_Dashboard.png)

---

### **Scanner**

![Scanner](screenshots/QR_Scanner.jpeg)

---

### **Selfie Camera**

![SelfieCamera](screenshots/Face_Scanner.jpeg)

---

### **Admin Dashboard**

![Admin Dashboard 1](screenshots/Admin_Dashboard1.png)

![Admin Dashboard 2](screenshots/Admin_Dashboard2.png)

![Admin Dashboard 3](screenshots/Admin_Dashboard3.png)

---

## **Modules**

- **User Authentication**: Secure login, role-based access control  
- **Dynamic QR Generation**: Time-limited, session-based QR codes  
- **QR Scanning**: Mobile browser-based scanning and session validation  
- **Live Camera Verification**: AI facial recognition with liveness detection  
- **GPS Validation**: Geo-fencing for physical presence verification  
- **Attendance Management**: Secure, tamper-proof attendance recording  
- **Admin Dashboard**: Real-time analytics, reports, and academic audits  

---

## **Technology Stack**

| Component        | Technology/Framework                 |
|-----------------|-------------------------------------|
| Frontend        | React.js / HTML / CSS / JavaScript   |
| Backend         | Node.js / Django / Flask             |
| Database        | MySQL / MongoDB                      |
| AI/ML Framework | TensorFlow / OpenCV                  |
| Browser Features| Camera & GPS support                 |

---

## **System Requirements**

**Software:**  
- Modern web browser with **camera & GPS support**  
- **Node.js / Django / Flask** server environment  

**Hardware:**  
- **Laptop/PC**: Minimum 8GB RAM, Intel i5/Ryzen 5, 256GB SSD  
- **Smartphone**: Android/iOS device with 8MP+ camera & GPS  
- **Internet**: Stable broadband connection (10 Mbps+)  

---

## **Expected Outcomes**

- **Secure and proxy-resistant attendance system**  
- **Real-time, accurate digital attendance records**  
- **Reduced administrative workload for faculty**  
- **Potential for publication** in IEEE/Scopus journals and participation in National Hackathons  
- **Cost-effective and scalable solution** for educational institutions
