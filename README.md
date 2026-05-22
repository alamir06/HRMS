# HRMS - Comprehensive Human Resource Management System

## Project Overview

**Title:** Comprehensive Human Resource Management System (HRMS) for Injibara University
**Authors:** Group One
**Date:** 2018 E.C. (GC Project)

The **HRMS** is a full-stack, enterprise-grade comprehensive Human Resource Management System built specifically for the Injibara University Human Resource Department. This project is structured into two main components:
- **HRMS_API:** A robust Express/Node.js backend API providing core services, data validation, and database interactions.
- **HRMS_UI:** A modern, responsive React-based frontend built with Vite, ensuring a seamless user experience.

---

## Technical Stack & Built With

### Backend (HRMS_API)
- **Runtime:** Node.js
- **Framework:** Express.js `^5.1`
- **Database:** MySQL2 (Relational Database)
- **Security & Authentication:** `bcryptjs`, `jsonwebtoken` (JWT), `helmet` (Security Headers), `cors`
- **Validation:** `zod`
- **File Upload & Storage:** `multer`, `cloudinary`, `multer-storage-cloudinary`
- **Utilities:** `node-cron` (Task Scheduling), `nodemailer` (Emailing), `node-html-to-image`, `express-rate-limit`

### Frontend (HRMS_UI)
- **Library:** React `^19.1`
- **Build Tool:** Vite
- **Routing:** React Router DOM `^7`
- **Styling / Icons:** Lucide React
- **HTTP Client:** Axios
- **State/Notifications:** React Toastify
- **Data Visualization:** Recharts
- **Internationalization (i18n):** `i18next`, `react-i18next`

---

## Architecture & Modules Breakdown

The backend is modularized with specific responsibilities mapped to various domains of the HR department. Below are the primary modules and their roles:

### 1. `Auth` & `Employee` Modules
- **Authentication (`Auth`):** Handles secure login, password resets, system user invitations with SMTP delivery, and default admin seeding. It provisions an Admin (HR Manager) on initial startup.
- **Employee Management (`Employee`):** Complete lifecycle management of employees including onboarding, profile updates, and active directory maintenance.

### 2. Organizational Structure Modules
- **`Department`** & **`Colleges`:** Models the academic and administrative structure of Injibara University.
- **`Jobs`** & **`Designation`:** Handles job postings, job roles, titles, hierarchical designations, and internal mobility.

### 3. Core HR Operations Modules
- **`Attendance`:** Tracks daily clock-in/out records, handles timesheets, and monitors absenteeism.
- **`Leave`:** Manages employee time-off requests, balances, approvals, and leave rollovers explicitly defined by university policies.
- **`Payroll`** & **`Benefit`:** Processes salary calculations, deducts taxes and provident funds, manages bonuses, and other employee benefits.
- **`Asset`:** Tracks university equipment or assets assigned to personnel.

### 4. Recruitment & Third-Party Management
- **`Recruitment`:** Streamlines the hiring process including applicant tracking, interview schedules, and candidate evaluation.
- **`OutsourcingCompany`:** Manages third-party agencies, outsourced contracts, and the external workforce utilized by the university.
- **`Recommendation`:** System for processing internal recommendations and peer-to-peer references.

### 5. Communication & Dashboard
- **`Notice`** & **`Notification`:** System-wide broadcasting, announcements, and push/email notifications for specific events (e.g., leave approvals, recruitment updates).
- **`Dashboard`:** Aggregates analytics, reporting endpoints, and provides visual stats used by the `Recharts` library on the frontend.

---

## User Roles & Capabilities

While the full granular RBAC (Role-Based Access Control) is highly customizable, the system typically supports the following user archetypes:

1. **HR Manager (Admin)**
   - Initial user seeded into the system.
   - Complete access to `Employee`, `Payroll`, `System Configuration`, and `Departments/Colleges`.
   - Ability to invite new system users.
2. **HR Staff / Recruiters**
   - Access to `Recruitment`, `Leave` approvals, `Attendance` tracking, and `Notice` posting.
3. **Employees / Faculty**
   - Can view personal profiles.
   - Submit `Leave` requests and view `Attendance` history.
   - Review personal `Payroll` slips.
   - Access public `Notice` and `Jobs`.

---

## Deployment & Setup Instructions

### Prerequisites
- Node.js (v18+ recommended)
- MySQL Database running locally or remotely.
- Cloudinary Account (for image/document uploads).
- SMTP Server Credentials (for system emails).

### 1. Database Setup
Ensure that you have MySQL installed. The system requires **exactly one row** in the `company` table at startup representing the university.
Run database scripts/migrations inside `HRMS_API/migrations` or the provided `.sql` files.

### 2. Backend Setup (`HRMS_API`)
```bash
cd HRMS_API
npm install
```
Create a `.env` file referencing the seeded configuration:
```env
# Database configuration
DB_HOST=localhost
DB_USER=root
# ...

# General settings
PORT=5000
JWT_SECRET=YourSuperSecretKey
BCRYPT_SALT_ROUNDS=10

# SMTP Setup
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
```
Start the server:
```bash
npm run dev
# The seeded admin username and generated credentials will be logged upon first startup
```

### 3. Frontend Setup (`HRMS_UI`)
```bash
cd HRMS_UI
npm install
```
Start the Vite Development Server:
```bash
npm run dev
```

---

## License & Contact
Developed as a Graduation Project by **Group One** for Injibara University (2018 E.C.). This project structure and documentation are proprietary to the project's developers unless specified otherwise.
