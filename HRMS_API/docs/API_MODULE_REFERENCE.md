# HRMS API Module Reference

All endpoints are rooted at `/api`. Unless otherwise noted, identifiers are UUID strings and timestamps use `YYYY-MM-DD` (dates) or ISO 8601 format. The shared CRUD routers expose `POST /`, `GET /`, `GET /:id`, `PUT|PATCH /:id`, and `DELETE /:id` for the associated table.

## Authentication
- **Tables:** `users`, `employee`, `employee_personal`
- **Seed Flow:** On startup the server runs `seedDefaultHrManager()` to create the first HR manager (see environment variables in [Server.js](Server.js#L19-L124) and [README.md](README.md)).
- **Endpoints:**
  - `POST /auth/login`
  - `POST /auth/users` *(HR_MANAGER only)*
  - `PATCH /auth/change-password` *(any authenticated user)*
- **Login Body:**
```json
{
  "identifier": "username-or-email",
  "password": "CurrentPassword1"
}
```
- **Create System User Body:**
```json
{
  "employee_id": "UUID",
  "username": "jane.doe",
  "temporary_password": "OptionalTemp1",
  "send_email": true
}
```
- **Password Change Body:**
```json
{
  "current_password": "OldPassword1",
  "new_password": "NewPassword1",
  "confirm_password": "NewPassword1"
}
```
- **Flow:** HR manager logs in, creates users for deans/heads/officers, system emails credentials (if SMTP configured), users must change password on first login when `must_change_password` is true.

## Company & Structure
### Company
- **Table:** `company`
- **Router:** `/companies`
- **Create Body Fields:**
  - `company_name` (string, required)
  - `company_address` (string, required)
  - `company_phone` (string, required)
  - `company_email` (email, required)
  - `company_established_date` (`YYYY-MM-DD`, required)
  - `company_tin_number` (string, required)
  - Optional: `company_name_amharic`, `company_address_amharic`, `company_website`, `company_logo`, `status`
- **Additional Flows:** dashboard stats `/companies/stats/dashboard`, bulk status update `/companies/bulk/update-status`, exports `/companies/export`, validation `/companies/validate`.

### College
- **Table:** `college`
- **Router:** `/colleges`
- **Create Body:** requires `company_id`, `college_name`; optional Amharic and description fields.
- **Key Flows:** list by company `/colleges/company/:companyId`, bulk create `/colleges/bulk/create`, stats `/colleges/stats/dashboard`.

### Department
- **Table:** `department`
- **Router:** `/departments`
- **Create Body:**
  - `company_id` (UUID, required)
  - `department_name` (string, required)
  - Optional: `college_id`, Amharic fields, `department_description`, `manager_id`, `department_status`
- **Flows:** lookup by company `/departments/company/:companyId`, by college `/departments/college/:collegeId`, assign manager `/departments/:id/manager`.

### Designation
- **Table:** `designations`
- **Router:** `/designations`
- **Create Body:** `department_id`, `title` are required; optional salary range, descriptions, status.
- **Flows:** fetch by department `/designations/department/:departmentId`, statistics `/designations/stats/dashboard`.

## Employee Management
- **Tables:** `employee`, `employee_personal`, `employee_employment`, `employee_academic`, `employee_hr`, `employee_outsource`, `employee_documents`, `employee_education`
- **Router:** `/employees`
- **Create Body (abridged):**
```json
{
  "employee_code": "EMP-001",
  "company_id": "UUID",
  "employee_category": "hr_officer",
  "department_id": "UUID",
  "designation_id": "UUID",
  "hire_date": "2025-01-01",
  "employment_type": "full_time",
  "employment_status": "active",
  "personal": {
    "first_name": "John",
    "last_name": "Doe",
    "personal_email": "john@example.com"
  },
  "employment": {
    "official_email": "john.doe@company.com",
    "salary": 12000
  },
  "academic": {
    "college_id": "UUID",
    "academic_rank": "Assistant Professor"
  },
  "outsource": {
    "outsourcing_company_id": "UUID"
  },
  "documents": [
    {
      "document_type": "id_document",
      "document_name": "Passport",
      "file_name": "passport.pdf",
      "file_path": "/uploads/documents/passport.pdf"
    }
  ],
  "education": [
    {
      "institution_name": "ABC University",
      "qualification": "MBA",
      "start_date": "2018-09-01"
    }
  ]
}
```
- **Flows:**
  1. Create employee with nested personal/employment data.
  2. Upload documents (`POST /employees/:id/documents`) and profile picture (`POST /employees/:id/profile-picture`).
  3. Manage education records (`POST /employees/:id/education`).
  4. Document verification via `PATCH /employees/documents/:documentId/verify`.

## Attendance Management
- **Table:** `attendance`
- **Router:** `/attendance`
- **Create Body:** `employee_id`, `date`, optional `check_in`, `check_out`, `status`, `late_minutes`, `overtime_minutes`, `notes`.
- **Flows:**
  1. HR/employee check-in via `POST /attendance/employees/:employeeId/check-in`.
  2. Check-out via `POST /attendance/employees/:employeeId/check-out`.
  3. Retrieve records `GET /attendance/employees/:employeeId` and summary `/attendance/employees/:employeeId/summary`.

## Leave Management
- **Tables:** `leave_types`, `leave_balance`, `leave_request`
- **Router:** `/leave`
- **Key Endpoints:**
  - Leave types CRUD at `/leave/types`
  - Leave balances CRUD at `/leave/balances`
  - Leave requests CRUD at `/leave/requests`
  - Apply for leave `POST /leave/requests/apply`
  - Approve/Reject `POST /leave/requests/:id/approve|reject`
  - Employee summary `/leave/employees/:employeeId/summary`
- **Apply Body:**
```json
{
  "employee_id": "UUID",
  "leave_type_id": "UUID",
  "start_date": "2025-02-01",
  "end_date": "2025-02-05",
  "reason": "Annual Vacation"
}
```
- **Flow:** Employee submits request → HR reviews via approve/reject endpoints → balances update accordingly.

## Asset Management
- **Tables:** `asset_category`, `assets`, `asset_assignment`
- **Router:** `/assets`
- **Create Asset Body:** requires `asset_name`, `asset_category_id`; optional serial, model, purchase info, status.
- **Assignment Flow:**
  1. Assign asset `POST /assets/assignments/assign`
```json
{
  "asset_id": "UUID",
  "employee_id": "UUID",
  "assigned_date": "2025-01-10",
  "expected_return_date": "2025-03-10",
  "assigned_by": "UUID"
}
```
  2. Mark return `POST /assets/assignments/:id/return`
- **Other Endpoints:** `/assets/items/available`, `/assets/items/:id/summary`, `/assets/employees/:employeeId/assets`.

## Benefit Management
- **Tables:** `benefits`, `employee_benefits`
- **Router:** `/benefits`
- **Benefit Body:** `benefit_name`, `benefit_type` with optional descriptions and costs.
- **Enroll Body:**
```json
{
  "employee_id": "UUID",
  "benefit_id": "UUID",
  "enrollment_date": "2025-01-15",
  "coverage_amount": 5000,
  "employee_contribution": 100,
  "company_contribution": 200
}
```
- **Flows:** create benefit catalog item → enroll employee `/benefits/enrollments/enroll` → update status `/benefits/enrollments/:id/status` → list employee benefits `/benefits/employees/:employeeId`.

## Recruitment Management
- **Tables:** `recruitment`, `applicant`, `interview_schedule`
- **Router:** `/recruitment`
- **Create Recruitment Body:**
```json
{
  "job_title": "Frontend Developer",
  "department_id": "UUID",
  "designation_id": "UUID",
  "vacancies": 3,
  "created_by": "UUID",
  "status": "open",
  "posted_date": "2025-02-01",
  "closing_date": "2025-02-28"
}
```
- **Applicant Body:** includes `recruitment_id`, candidate name, `email`, optional salary expectations, etc.
- **Interview Body:** `applicant_id`, `interview_date`, `interview_time`, `interview_type`, optional `interviewers`, `location`.
- **Flow:** post recruitment → collect applicants (`POST /recruitment/applicants`) → manage status (`PATCH /recruitment/applicants/:id/status`) → schedule interviews (`POST /recruitment/interviews`) → log feedback (`PATCH /recruitment/interviews/:id/feedback`).

## Notice Board
- **Table:** `notices`
- **Router:** `/notices`
- **Create Body:**
```json
{
  "title": "Staff Meeting",
  "content": "All staff meeting on Friday at 10 AM.",
  "notice_type": "event",
  "target_audience": "department",
  "target_department_id": "UUID",
  "publish_date": "2025-02-05",
  "created_by": "UUID"
}
```
- **Flow:** create draft (optionally with audience constraints) → update as needed → publish via `PATCH /notices/:id/publish` (can include `publish_date`, `expiry_date`).
- **Queries:** filter notices with `notice_type`, `target_audience`, `department_id`, `employee_id`, `is_published`, `active_only` query params.

## Notifications
- **Table:** `notifications`
- **Router:** `/notifications`
- **Create Body:**
```json
{
  "user_id": "UUID",
  "title": "Leave Application Approved",
  "message": "Your recent leave request has been approved.",
  "notification_type": "success",
  "related_module": "leave",
  "related_id": "UUID"
}
```
- **Flow:** create notification → users fetch via `/notifications/user/:userId` with optional query filters (`is_read`, `notification_type`, pagination) → mark single read `/notifications/:id/read` or bulk `/notifications/user/:userId/read`.

## Payroll
- **Table:** `payroll`
- **Router:** `/payroll`
- **Create Body:**
```json
{
  "employee_id": "UUID",
  "pay_period_start": "2025-01-01",
  "pay_period_end": "2025-01-31",
  "basic_salary": 15000,
  "house_rent_allowance": 2000,
  "travel_allowance": 500,
  "medical_allowance": 300,
  "overtime_allowance": 0,
  "other_allowances": 0,
  "tax_deduction": 1000,
  "provident_fund": 500,
  "leave_deduction": 0,
  "other_deductions": 0,
  "payment_date": "2025-02-05",
  "payment_status": "Pending",
  "generated_by": "UUID"
}
```
- **Flow:** create payroll record (totals are auto-calculated) → update as needed → mark paid via `PATCH /payroll/:id/mark-paid` (sets status/date) → employee views slip with `GET /payroll/:id/slip` or list via `/payroll/employee/:employeeId`.

## Attendance & Leave Interaction
- Attendance and leave modules share employee UUIDs. Use attendance summaries to validate leave usage. `leave_balance` references `leave_types` and `employee` as per schema.

## Notifications & Notices Integration
- After publishing a notice, create related notifications targeting `user_id` values to ensure delivery via `/notifications`.

## Email Delivery
- The credential email uses SMTP settings set in environment variables. When SMTP is absent, messages are logged (see [utils/emailService.js](utils/emailService.js)).

## Outsourcing Companies
- Outsourced employees reference the `outsourcing_companies` table; ensure the vendor is created before linking via the employee payload `outsource.outsourcing_company_id`.

This reference mirrors validation schemas and table constraints defined in [HRMS.SQL](HRMS.SQL) to keep request bodies aligned with the database model.
