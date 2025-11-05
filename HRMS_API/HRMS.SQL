-- CREATE DATABAS
CREATE DATABASE IF NOT EXISTS HRMS;
USE HRMS;
-- ORGANIZATION STRUCTUR
CREATE TABLE company (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    company_name VARCHAR(255) NOT NULL,
    company_name_amharic VARCHAR(255),
    company_address TEXT,
    company_address_amharic TEXT,
    company_phone VARCHAR(20),
    company_email VARCHAR(150),
    company_website VARCHAR(255),
    company_logo VARCHAR(255),
    company_established_date DATE,
    company_tin_number VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- EMPLOYEE CATEGORIE
CREATE TABLE employee_categories (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    category_name VARCHAR(100) NOT NULL,
    category_name_amharic VARCHAR(100),
    category_type ENUM('academic', 'hr_officer', 'outsource') NOT NULL,
    description TEXT,
    description_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- HR OFFICER ROLE
CREATE TABLE hr_roles (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    role_name VARCHAR(255) NOT NULL,
    role_name_amharic VARCHAR(255),
    role_code VARCHAR(50) UNIQUE NOT NULL,
    role_description TEXT,
    role_description_amharic TEXT,
    role_permissions JSON,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- OUTSOURCING COMPANIE
CREATE TABLE outsourcing_companies (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    company_name VARCHAR(255) NOT NULL,
    company_name_amharic VARCHAR(255),
    company_contact_person VARCHAR(255),
    company_contact_person_amharic VARCHAR(255),
    company_email VARCHAR(150),
    company_phone VARCHAR(20),
    company_address TEXT,
    company_address_amharic TEXT,
    company_service_type ENUM('security', 'cleaning', 'it', 'catering', 'maintenance', 'other') NOT NULL,
    company_contract_start_date DATE,
    company_contract_end_date DATE,
    company_status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- COLLEGE
CREATE TABLE college (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    company_id BINARY(16) NOT NULL,
    college_name VARCHAR(255) NOT NULL,
    college_name_amharic VARCHAR(255),
    college_description TEXT,
    college_description_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- DEPARTMEN
CREATE TABLE department (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    company_id BINARY(16) NOT NULL,
    college_id BINARY(16),
    department_name VARCHAR(255) NOT NULL,
    department_name_amharic VARCHAR(255),
    department_description TEXT,
    department_description_amharic TEXT,
    manager_id BINARY(16),
    department_status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- DESIGNATION
CREATE TABLE designations (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    department_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_amharic VARCHAR(255),
    job_description TEXT,
    job_description_amharic TEXT,
    grade_level VARCHAR(50),
    min_salary DECIMAL(10,2),
    max_salary DECIMAL(10,2),
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- SINGLE EMPLOYEE TABLE
CREATE TABLE employee (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    company_id BINARY(16) NOT NULL,
    employee_category_id BINARY(16) NOT NULL,
    employee_type ENUM('academic', 'hr_officer', 'outsource') NOT NULL,
    department_id BINARY(16) NOT NULL,
    designation_id BINARY(16) NOT NULL,
    manager_id BINARY(16),
    hire_date DATE NOT NULL,
    employment_type ENUM('full_time', 'part_time', 'contract', 'intern') NOT NULL,
    employment_status ENUM('active', 'on_leave', 'terminated', 'resigned') DEFAULT 'active',
    termination_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
CREATE TABLE employee_personal (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    first_name_amharic VARCHAR(100),
    middle_name VARCHAR(100),
    middle_name_amharic VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    last_name_amharic VARCHAR(100),
    gender ENUM('male', 'female', 'other'),
    date_of_birth DATE,
    personal_email VARCHAR(150),
    personal_phone VARCHAR(20),
    emergency_contact_name VARCHAR(100),
    emergency_contact_name_amharic VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    address TEXT,
    address_amharic TEXT,
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);
-- optiona table
CREATE TABLE employee_employment (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    official_email VARCHAR(150) UNIQUE NOT NULL,
    official_phone VARCHAR(20),
    salary DECIMAL(12,2),
    qualification VARCHAR(100),
    qualification_amharic VARCHAR(100),
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

CREATE TABLE employee_academic (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    college_id BINARY(16),
    academic_rank VARCHAR(50),
    academic_rank_amharic VARCHAR(50),
    academic_status ENUM('active', 'on_leave', 'sabbatical') DEFAULT 'active',
    field_of_specialization VARCHAR(100),
    field_of_specialization_amharic VARCHAR(100),
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

CREATE TABLE employee_hr (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    hr_role_id BINARY(16) NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);
CREATE TABLE employee_outsource (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    outsourcing_company_id BINARY(16) NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

-- USER AUTHENTICATIO
CREATE TABLE users (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('HR_MANAGER', 'DEAN', 'employee', 'HEAD', 'FINANCE_OFFICER') NOT NULL,
    preferred_language ENUM('en', 'am') DEFAULT 'am',
    last_login TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- ATTENDANCE MANAGEMEN
CREATE TABLE attendance (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    status ENUM('Present', 'Late', 'Absent', 'half_day', 'holiday', 'weekend') DEFAULT 'Absent',
    late_minutes INT DEFAULT 0,
    overtime_minutes INT DEFAULT 0,
    notes TEXT,
    notes_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_employee_date (employee_id, date)
);

CREATE TABLE shift_schedule (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    shift_name VARCHAR(100) NOT NULL,
    shift_name_amharic VARCHAR(100),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_duration_minutes INT DEFAULT 60,
    description TEXT,
    description_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_shift (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    shift_id BINARY(16) NOT NULL,
    effective_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- LEAVE MANAGEMEN
CREATE TABLE leave_types (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    leave_name VARCHAR(100) NOT NULL,
    leave_name_amharic VARCHAR(100),
    leave_description TEXT,
    leave_description_amharic TEXT,
    max_days_per_year INT NOT NULL,
    carry_forward_days INT DEFAULT 0,
    requires_approval BOOLEAN DEFAULT TRUE,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leave_balance (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    leave_type_id BINARY(16) NOT NULL,
    year INT NOT NULL,
    total_allocated_days INT NOT NULL,
    used_days INT DEFAULT 0,
    remaining_days INT NOT NULL,
    carry_forward_days INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_employee_leave_year (employee_id, leave_type_id, year)
);

CREATE TABLE leave_request (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    leave_type_id BINARY(16) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    reason TEXT,
    reason_amharic TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by BINARY(16),
    approved_at TIMESTAMP NULL,
    comments TEXT,
    comments_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- PAYROLL MANAGEMEN
CREATE TABLE payroll (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary DECIMAL(10,2) NOT NULL,
    house_rent_allowance DECIMAL(10,2) DEFAULT 0,
    travel_allowance DECIMAL(10,2) DEFAULT 0,
    medical_allowance DECIMAL(10,2) DEFAULT 0,
    other_allowances DECIMAL(10,2) DEFAULT 0,
    total_earnings DECIMAL(10,2) NOT NULL,
    
    -- Deductions
    tax_deduction DECIMAL(10,2) DEFAULT 0,
    provident_fund DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    
    net_salary DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    payment_status ENUM('Pending', 'Paid', 'Unpaid') DEFAULT 'Pending',
    generated_by BINARY(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE salary_components (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    component_name VARCHAR(100) NOT NULL,
    component_name_amharic VARCHAR(100),
    component_type ENUM('earning', 'deduction') NOT NULL,
    is_taxable BOOLEAN DEFAULT FALSE,
    description TEXT,
    description_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- BENEFITS MANAGEMEN
CREATE TABLE benefits (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    benefit_name VARCHAR(255) NOT NULL,
    benefit_name_amharic VARCHAR(255),
    description TEXT,
    description_amharic TEXT,
    benefit_type ENUM('health', 'retirement', 'insurance', 'wellness', 'other') NOT NULL,
    cost_to_company DECIMAL(10,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employee_benefits (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    benefit_id BINARY(16) NOT NULL,
    enrollment_date DATE NOT NULL,
    coverage_amount DECIMAL(10,2),
    employee_contribution DECIMAL(10,2),
    company_contribution DECIMAL(10,2),
    status ENUM('active', 'cancelled', 'suspended') DEFAULT 'active',
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- TRAINING & DEVELOPMEN
CREATE TABLE training_programs (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    program_name VARCHAR(255) NOT NULL,
    program_name_amharic VARCHAR(255),
    description TEXT,
    description_amharic TEXT,
    trainer_name VARCHAR(255),
    trainer_name_amharic VARCHAR(255),
    duration_hours INT,
    cost DECIMAL(10,2),
    status ENUM('draft', 'scheduled', 'completed', 'cancelled') DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE training_sessions (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    training_program_id BINARY(16) NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location VARCHAR(255),
    location_amharic VARCHAR(255),
    max_participants INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE training_participants (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    training_session_id BINARY(16) NOT NULL,
    employee_id BINARY(16) NOT NULL,
    status ENUM('registered', 'attended', 'absent', 'completed') DEFAULT 'registered',
    feedback TEXT,
    feedback_amharic TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- RECRUITMENT MANAGEMEN
CREATE TABLE recruitment (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    job_title VARCHAR(255) NOT NULL,
    job_title_amharic VARCHAR(255),
    department_id BINARY(16) NOT NULL,
    designation_id BINARY(16) NOT NULL,
    job_description TEXT,
    job_description_amharic TEXT,
    requirements TEXT,
    requirements_amharic TEXT,
    vacancies INT NOT NULL,
    experience_required VARCHAR(100),
    salary_range VARCHAR(100),
    status ENUM('draft', 'open', 'closed', 'cancelled') DEFAULT 'draft',
    posted_date DATE,
    closing_date DATE,
    created_by BINARY(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE applicant (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    recruitment_id BINARY(16) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    first_name_amharic VARCHAR(100),
    last_name VARCHAR(100) NOT NULL,
    last_name_amharic VARCHAR(100),
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    resume_url VARCHAR(255),
    cover_letter TEXT,
    cover_letter_amharic TEXT,
    current_company VARCHAR(255),
    current_position VARCHAR(255),
    total_experience DECIMAL(3,1),
    current_salary DECIMAL(10,2),
    expected_salary DECIMAL(10,2),
    notice_period INT,
    status ENUM('applied', 'screening', 'interview', 'offered', 'rejected', 'hired') DEFAULT 'applied',
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE interview_schedule (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    applicant_id BINARY(16) NOT NULL,
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    interview_type ENUM('phone', 'video', 'in_person') NOT NULL,
    interviewers JSON,
    location VARCHAR(255),
    location_amharic VARCHAR(255),
    status ENUM('scheduled', 'completed', 'cancelled', 'no_show') DEFAULT 'scheduled',
    feedback TEXT,
    feedback_amharic TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- ONBOARDING & OFFBOARDIN
CREATE TABLE onboarding_checklist (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    task_name_amharic VARCHAR(255),
    assigned_to BINARY(16) NOT NULL,
    due_date DATE,
    status ENUM('pending', 'in_progress', 'completed') DEFAULT 'pending',
    completed_date DATE,
    notes TEXT,
    notes_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE offboarding (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    separation_date DATE NOT NULL,
    separation_type ENUM('resignation', 'termination', 'retirement', 'end_of_contract') NOT NULL,
    reason TEXT,
    reason_amharic TEXT,
    exit_interview_notes TEXT,
    exit_interview_notes_amharic TEXT,
    last_working_date DATE,
    status ENUM('initiated', 'in_progress', 'completed') DEFAULT 'initiated',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- ASSETS MANAGEMEN
CREATE TABLE asset_category (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    category_name VARCHAR(255) NOT NULL,
    category_name_amharic VARCHAR(255),
    description TEXT,
    description_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    asset_name VARCHAR(255) NOT NULL,
    asset_name_amharic VARCHAR(255),
    asset_category_id BINARY(16) NOT NULL,
    serial_number VARCHAR(100) UNIQUE,
    model VARCHAR(100),
    purchase_date DATE,
    purchase_cost DECIMAL(10,2),
    current_value DECIMAL(10,2),
    status ENUM('available', 'assigned', 'maintenance', 'disposed') DEFAULT 'available',
    location VARCHAR(255),
    location_amharic VARCHAR(255),
    notes TEXT,
    notes_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE asset_assignment (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    asset_id BINARY(16) NOT NULL,
    employee_id BINARY(16) NOT NULL,
    assigned_date DATE NOT NULL,
    expected_return_date DATE,
    actual_return_date DATE,
    assignment_reason TEXT,
    assignment_reason_amharic TEXT,
    condition_assigned TEXT,
    condition_assigned_amharic TEXT,
    condition_returned TEXT,
    condition_returned_amharic TEXT,
    status ENUM('assigned', 'returned', 'overdue') DEFAULT 'assigned',
    assigned_by BINARY(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- NOTICE MANAGEMEN
CREATE TABLE notices (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    title VARCHAR(255) NOT NULL,
    title_amharic VARCHAR(255),
    content TEXT NOT NULL,
    content_amharic TEXT,
    notice_type ENUM('general', 'policy', 'event', 'urgent') DEFAULT 'general',
    target_audience ENUM('all', 'department', 'individual') DEFAULT 'all',
    target_department_id BINARY(16),
    target_employee_id BINARY(16),
    publish_date DATE NOT NULL,
    expiry_date DATE,
    is_published BOOLEAN DEFAULT FALSE,
    created_by BINARY(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
-- NOTIFICATIONS MANAGEMEN
CREATE TABLE notifications (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    user_id BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    title_amharic VARCHAR(255),
    message TEXT NOT NULL,
    message_amharic TEXT,
    notification_type ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
    related_module ENUM('attendance', 'leave', 'payroll', 'recruitment', 'performance', 'general') DEFAULT 'general',
    related_id BINARY(16),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- REPORTS MANAGEMEN
CREATE TABLE report_templates (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    report_name VARCHAR(255) NOT NULL,
    report_name_amharic VARCHAR(255),
    description TEXT,
    description_amharic TEXT,
    report_sql TEXT,
    parameters JSON,
    created_by BINARY(16) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE saved_reports (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    report_template_id BINARY(16) NOT NULL,
    report_name VARCHAR(255) NOT NULL,
    report_name_amharic VARCHAR(255),
    parameters JSON,
    generated_by BINARY(16) NOT NULL,
    file_url VARCHAR(255),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- ADD FOREIGN KEY CONSTRAINT
-- College foreign keys
ALTER TABLE college ADD FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;

-- Department foreign keys
ALTER TABLE department 
ADD FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
ADD FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE SET NULL,
ADD FOREIGN KEY (manager_id) REFERENCES employee(id) ON DELETE SET NULL;

-- Designations foreign keys
ALTER TABLE designations ADD FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE;

-- Employee foreign keys
ALTER TABLE employee 
ADD FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
ADD FOREIGN KEY (employee_category_id) REFERENCES employee_categories(id) ON DELETE CASCADE,
ADD FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE,
ADD FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE CASCADE,
ADD FOREIGN KEY (manager_id) REFERENCES employee(id) ON DELETE SET NULL;

-- Employee Personal foreign keys
ALTER TABLE employee_personal 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;

-- Employee Employment foreign keys  
ALTER TABLE employee_employment 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;

-- Employee Academic foreign keys
ALTER TABLE employee_academic 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE SET NULL;

-- Employee HR foreign keys
ALTER TABLE employee_hr 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (hr_role_id) REFERENCES hr_roles(id) ON DELETE CASCADE;

-- Employee Outsource foreign keys
ALTER TABLE employee_outsource 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (outsourcing_company_id) REFERENCES outsourcing_companies(id) ON DELETE CASCADE;

-- Users foreign keys
ALTER TABLE users ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;

-- Attendance foreign keys
ALTER TABLE attendance ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;

-- Employee shift foreign keys
ALTER TABLE employee_shift 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (shift_id) REFERENCES shift_schedule(id) ON DELETE CASCADE;

-- Leave balance foreign keys
ALTER TABLE leave_balance 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;

-- Leave request foreign keys
ALTER TABLE leave_request 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE,
ADD FOREIGN KEY (approved_by) REFERENCES employee(id) ON DELETE SET NULL;

-- Payroll foreign keys
ALTER TABLE payroll 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE;

-- Training sessions foreign keys
ALTER TABLE training_sessions ADD FOREIGN KEY (training_program_id) REFERENCES training_programs(id) ON DELETE CASCADE;

-- Training participants foreign keys
ALTER TABLE training_participants 
ADD FOREIGN KEY (training_session_id) REFERENCES training_sessions(id) ON DELETE CASCADE,
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;

-- Recruitment foreign keys
ALTER TABLE recruitment 
ADD FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE,
ADD FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE CASCADE,
ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Applicant foreign keys
ALTER TABLE applicant ADD FOREIGN KEY (recruitment_id) REFERENCES recruitment(id) ON DELETE CASCADE;

-- Interview schedule foreign keys
ALTER TABLE interview_schedule ADD FOREIGN KEY (applicant_id) REFERENCES applicant(id) ON DELETE CASCADE;

-- Onboarding checklist foreign keys
ALTER TABLE onboarding_checklist 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (assigned_to) REFERENCES employee(id) ON DELETE CASCADE;

-- Offboarding foreign keys
ALTER TABLE offboarding ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;

-- Assets foreign keys
ALTER TABLE assets ADD FOREIGN KEY (asset_category_id) REFERENCES asset_category(id) ON DELETE CASCADE;

-- Asset assignment foreign keys
ALTER TABLE asset_assignment 
ADD FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE;

-- Employee benefits foreign keys
ALTER TABLE employee_benefits 
ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (benefit_id) REFERENCES benefits(id) ON DELETE CASCADE;

-- Notices foreign keys
ALTER TABLE notices 
ADD FOREIGN KEY (target_department_id) REFERENCES department(id) ON DELETE CASCADE,
ADD FOREIGN KEY (target_employee_id) REFERENCES employee(id) ON DELETE CASCADE,
ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Notifications foreign keys
ALTER TABLE notifications ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Report templates foreign keys
ALTER TABLE report_templates ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

-- Saved reports foreign keys
ALTER TABLE saved_reports 
ADD FOREIGN KEY (report_template_id) REFERENCES report_templates(id) ON DELETE CASCADE,
ADD FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE;
-- CREATE INDEXES for Performanc
-- (All indexes remain the same as your original schema)
CREATE INDEX idx_employee_department ON employee(department_id);
CREATE INDEX idx_employee_designation ON employee(designation_id);
CREATE INDEX idx_employee_manager ON employee(manager_id);
CREATE INDEX idx_employee_status ON employee(employment_status);
CREATE INDEX idx_employee_type ON employee(employee_type);
CREATE INDEX idx_employee_category ON employee(employee_category_id);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_leave_request_employee ON leave_request(employee_id);
CREATE INDEX idx_leave_request_status ON leave_request(status);
CREATE INDEX idx_payroll_employee_period ON payroll(employee_id, pay_period_start);
CREATE INDEX idx_recruitment_status ON recruitment(status);
CREATE INDEX idx_applicant_recruitment_status ON applicant(recruitment_id, status);
CREATE INDEX idx_asset_status ON assets(status);
CREATE INDEX idx_notices_publish ON notices(publish_date, is_published);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
-- Indexes for the new tables
CREATE INDEX idx_employee_personal_employee ON employee_personal(employee_id);
CREATE INDEX idx_employee_employment_employee ON employee_employment(employee_id);
CREATE INDEX idx_employee_academic_employee ON employee_academic(employee_id);
CREATE INDEX idx_employee_hr_employee ON employee_hr(employee_id);
CREATE INDEX idx_employee_outsource_employee ON employee_outsource(employee_id);
-- Unique constraints for one-to-one relationships
ALTER TABLE employee_personal ADD UNIQUE KEY unique_employee_personal (employee_id);
ALTER TABLE employee_employment ADD UNIQUE KEY unique_employee_employment (employee_id);
ALTER TABLE employee_academic ADD UNIQUE KEY unique_employee_academic (employee_id);
ALTER TABLE employee_hr ADD UNIQUE KEY unique_employee_hr (employee_id);
ALTER TABLE employee_outsource ADD UNIQUE KEY unique_employee_outsource (employee_id);

-- VALIDATION TRIGGER (Updated for normalized schema)
DELIMITER //
CREATE TRIGGER validate_employee_type_consistency
BEFORE INSERT ON employee
FOR EACH ROW
BEGIN
    -- Note: We can't validate college_id, hr_role_id, outsourcing_company_id here anymore
    -- because they're in separate tables. The validation will be done in application logic
    -- and in the AFTER INSERT triggers on the child tables.
    
    -- We can only validate manager is not self
    IF NEW.manager_id IS NOT NULL AND NEW.manager_id = NEW.id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee cannot be their own manager';
    END IF;
END//
DELIMITER ;

-- Create validation triggers for the child tables
DELIMITER //

-- Trigger to validate academic employees have college assigned
CREATE TRIGGER validate_academic_employee_consistency
AFTER INSERT ON employee_academic
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    DECLARE emp_college_id BINARY(16);
    
    -- Get employee type and college_id
    SELECT e.employee_type, ea.college_id INTO emp_type, emp_college_id
    FROM employee e
    LEFT JOIN employee_academic ea ON e.id = ea.employee_id
    WHERE e.id = NEW.employee_id;
    
    IF emp_type = 'academic' AND emp_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic employees must have a college assigned in employee_academic table';
    END IF;
END//

-- Trigger to validate HR officers have HR role assigned
CREATE TRIGGER validate_hr_employee_consistency
AFTER INSERT ON employee_hr
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    
    -- Get employee type
    SELECT employee_type INTO emp_type 
    FROM employee 
    WHERE id = NEW.employee_id;
    
    IF emp_type != 'hr_officer' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HR info can only be added for HR officer employees';
    END IF;
END//

-- Trigger to validate outsourced employees have outsourcing company assigned
CREATE TRIGGER validate_outsource_employee_consistency
AFTER INSERT ON employee_outsource
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    
    -- Get employee type
    SELECT employee_type INTO emp_type 
    FROM employee 
    WHERE id = NEW.employee_id;
    
    IF emp_type != 'outsource' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Outsource info can only be added for outsourced employees';
    END IF;
END//

-- Trigger to prevent wrong employee type data in academic table
CREATE TRIGGER prevent_wrong_type_academic
BEFORE INSERT ON employee_academic
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    
    -- Get employee type
    SELECT employee_type INTO emp_type 
    FROM employee 
    WHERE id = NEW.employee_id;
    
    IF emp_type != 'academic' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic information can only be added for academic employees';
    END IF;
END//

-- Trigger to prevent wrong employee type data in HR table
CREATE TRIGGER prevent_wrong_type_hr
BEFORE INSERT ON employee_hr
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    
    -- Get employee type
    SELECT employee_type INTO emp_type 
    FROM employee 
    WHERE id = NEW.employee_id;
    
    IF emp_type != 'hr_officer' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HR information can only be added for HR officer employees';
    END IF;
END//

-- Trigger to prevent wrong employee type data in outsource table
CREATE TRIGGER prevent_wrong_type_outsource
BEFORE INSERT ON employee_outsource
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    
    -- Get employee type
    SELECT employee_type INTO emp_type 
    FROM employee 
    WHERE id = NEW.employee_id;
    
    IF emp_type != 'outsource' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Outsource information can only be added for outsourced employees';
    END IF;
END//

DELIMITER ;

-- Create a comprehensive view to check employee data consistency
CREATE VIEW employee_consistency_check AS
SELECT 
    e.id,
    e.employee_code,
    e.employee_type,
    CASE 
        WHEN e.employee_type = 'academic' AND ea.id IS NULL THEN 'MISSING_ACADEMIC_INFO'
        WHEN e.employee_type = 'hr_officer' AND eh.id IS NULL THEN 'MISSING_HR_INFO'
        WHEN e.employee_type = 'outsource' AND eo.id IS NULL THEN 'MISSING_OUTSOURCE_INFO'
        WHEN e.employee_type = 'academic' AND ea.college_id IS NULL THEN 'MISSING_COLLEGE'
        ELSE 'VALID'
    END as consistency_status,
    ep.first_name,
    ep.last_name
FROM employee e
LEFT JOIN employee_personal ep ON e.id = ep.employee_id
LEFT JOIN employee_academic ea ON e.id = ea.employee_id
LEFT JOIN employee_hr eh ON e.id = eh.employee_id
LEFT JOIN employee_outsource eo ON e.id = eo.employee_id;
-- HELPER VIEW FOR BILINGUAL DAT
-- Drop the old view
DROP VIEW IF EXISTS employee_bilingual;

-- Create updated bilingual view
CREATE VIEW employee_bilingual AS
SELECT 
    e.*,
    ep.first_name, ep.first_name_amharic, 
    ep.middle_name, ep.middle_name_amharic,
    ep.last_name, ep.last_name_amharic,
    ep.gender, ep.date_of_birth,
    ee.official_email, ee.official_phone, ee.salary,
    ea.academic_rank, ea.academic_rank_amharic,
    ea.field_of_specialization, ea.field_of_specialization_amharic,
    d.department_name, d.department_name_amharic,
    des.title as designation_title, des.title_amharic as designation_title_amharic,
    ec.category_name, ec.category_name_amharic,
    u.preferred_language,
    -- Display names based on preferred language
    CASE 
        WHEN u.preferred_language = 'am' AND ep.first_name_amharic IS NOT NULL 
        THEN ep.first_name_amharic 
        ELSE ep.first_name 
    END as display_first_name,
    CASE 
        WHEN u.preferred_language = 'am' AND ep.last_name_amharic IS NOT NULL 
        THEN ep.last_name_amharic 
        ELSE ep.last_name 
    END as display_last_name
FROM employee e
LEFT JOIN employee_personal ep ON e.id = ep.employee_id
LEFT JOIN employee_employment ee ON e.id = ee.employee_id
LEFT JOIN employee_academic ea ON e.id = ea.employee_id
LEFT JOIN department d ON e.department_id = d.id
LEFT JOIN designations des ON e.designation_id = des.id
LEFT JOIN employee_categories ec ON e.employee_category_id = ec.id
LEFT JOIN users u ON e.id = u.employee_id;

-- Trigger for academic employees
DELIMITER //
CREATE TRIGGER validate_academic_employee
BEFORE INSERT ON employee_academic
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    
    -- Get employee type
    SELECT employee_type INTO emp_type FROM employee WHERE id = NEW.employee_id;
    
    IF emp_type != 'academic' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic info can only be added for academic employees';
    END IF;
END//
DELIMITER ;

-- Trigger for HR employees
DELIMITER //
CREATE TRIGGER validate_hr_employee
BEFORE INSERT ON employee_hr
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    
    -- Get employee type
    SELECT employee_type INTO emp_type FROM employee WHERE id = NEW.employee_id;
    
    IF emp_type != 'hr_officer' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HR info can only be added for HR officer employees';
    END IF;
END//
DELIMITER ;

-- Trigger for outsource employees
DELIMITER //
CREATE TRIGGER validate_outsource_employee
BEFORE INSERT ON employee_outsource
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    
    -- Get employee type
    SELECT employee_type INTO emp_type FROM employee WHERE id = NEW.employee_id;
    
    IF emp_type != 'outsource' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Outsource info can only be added for outsourced employees';
    END IF;
END//
DELIMITER ;