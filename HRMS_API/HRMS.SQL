CREATE DATABASE IF NOT EXISTS HRMS;
USE HRMS;

-- ORGANIZATION STRUCTURE
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
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OUTSOURCING VENDORS
CREATE TABLE outsourcing_companies (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    company_id BINARY(16) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_name_amharic VARCHAR(255),
    company_address TEXT,
    company_address_amharic TEXT,
    company_phone VARCHAR(20),
    company_email VARCHAR(150),
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

-- DEPARTMENT WITH TYPE
CREATE TABLE department (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    company_id BINARY(16) NOT NULL,
    college_id BINARY(16),
    department_name VARCHAR(255) NOT NULL,
    department_name_amharic VARCHAR(255),
    department_description TEXT,
    department_description_amharic TEXT,
    department_type ENUM('academic', 'administrative', 'support', 'hr') DEFAULT 'administrative',
    manager_id BINARY(16),
    department_status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- DESIGNATION WITH ASSIGNED EMPLOYEE
CREATE TABLE designations (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    department_id BINARY(16),
    college_id BINARY(16),
    title VARCHAR(255) NOT NULL,
    title_amharic VARCHAR(255),
    job_description TEXT,
    job_description_amharic TEXT,
    grade_level VARCHAR(50),
    min_salary DECIMAL(10,2),
    max_salary DECIMAL(10,2),
    designation_type ENUM('academic', 'administrative', 'hr', 'support') DEFAULT 'administrative',
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_designation_employee (employee_id),
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

-- SINGLE EMPLOYEE TABLE WITH ROLE (designation_id removed)
CREATE TABLE employee (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_code VARCHAR(50) UNIQUE NOT NULL,
    company_id BINARY(16) NOT NULL,
    employee_type ENUM('academic', 'hr_officer', 'outsource') NOT NULL,
    employee_category ENUM('hr_officer', 'academic', 'outsource') NOT NULL,
    employee_role ENUM('HR_MANAGER', 'DEAN', 'employee', 'HEAD', 'HR_OFFICER', 'RECRUITER', 'PAYROLL_OFFICER') DEFAULT 'employee',
    department_id BINARY(16)  NULL,
    manager_id BINARY(16),
    hire_date DATE NOT NULL,
    employment_type ENUM('full_time', 'part_time', 'contract', 'intern') NOT NULL DEFAULT 'full_time',
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
    gender VARCHAR(20),
    date_of_birth DATE,
    personal_email VARCHAR(150),
    personal_phone VARCHAR(20),
    emergency_contact_name VARCHAR(150),
    emergency_contact_name_amharic VARCHAR(150),
    emergency_contact_phone VARCHAR(20),
    profile_picture VARCHAR(255),
    address TEXT,
    address_amharic TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE employee_employment (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    official_email VARCHAR(150),
    official_phone VARCHAR(20),
    salary DECIMAL(10,2),
    qualification VARCHAR(150),
    qualification_amharic VARCHAR(150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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

-- HR-SPECIFIC INFORMATION
CREATE TABLE employee_hr (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    hr_specialization ENUM('recruitment', 'payroll', 'training', 'employee_relations', 'compliance', 'generalist') DEFAULT 'generalist',
    hr_level ENUM('officer', 'supervisor', 'manager', 'director') DEFAULT 'officer',
    certifications JSON,
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);


CREATE TABLE employee_outsource (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    outsourcing_company_id BINARY(16) NOT NULL,
    contract_start_date DATE,
    contract_end_date DATE,
    service_type ENUM('security', 'cleaning', 'it', 'catering', 'maintenance', 'other') NOT NULL,
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE
);

-- Create employee_documents table for ID documents and other documents
CREATE TABLE employee_documents (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    document_type ENUM('id_document', 'education', 'certification', 'contract', 'other') NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_name_amharic VARCHAR(255),
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(255),
    description TEXT,
    description_amharic TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by BINARY(16),
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES employee(id) ON DELETE SET NULL
);

-- Create employee_education table for structured education data
CREATE TABLE employee_education (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    institution_name VARCHAR(255) NOT NULL,
    institution_name_amharic VARCHAR(255),
    qualification VARCHAR(100) NOT NULL,
    qualification_amharic VARCHAR(100),
    field_of_study VARCHAR(255),
    field_of_study_amharic VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    graduation_date DATE,
    grade VARCHAR(50),
    description TEXT,
    description_amharic TEXT,
    document_id BINARY(16), -- Reference to document in employee_documents
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES employee_documents(id) ON DELETE SET NULL
);


-- USER AUTHENTICATION
CREATE TABLE users(
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    system_role ENUM('HR_MANAGER', 'DEAN', 'employee', 'HEAD', 'HR_OFFICER', 'RECRUITER', 'PAYROLL_OFFICER') DEFAULT 'employee',
    password_hash VARCHAR(255) NOT NULL,
    preferred_language ENUM('en', 'am') DEFAULT 'am',
    last_login TIMESTAMP NULL,
    must_change_password BOOLEAN DEFAULT FALSE,
    password_changed_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ATTENDANCE MANAGEMENT
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

-- LEAVE MANAGEMENT
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

-- SIMPLIFIED PAYROLL TABLE FOR PAYSLIP GENERATION
CREATE TABLE payroll (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employee_id BINARY(16) NOT NULL,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    
    -- Earnings
    basic_salary DECIMAL(10,2) NOT NULL,
    house_rent_allowance DECIMAL(10,2) DEFAULT 0,
    travel_allowance DECIMAL(10,2) DEFAULT 0,
    medical_allowance DECIMAL(10,2) DEFAULT 0,
    overtime_allowance DECIMAL(10,2) DEFAULT 0,
    other_allowances DECIMAL(10,2) DEFAULT 0,
    total_earnings DECIMAL(10,2) NOT NULL,
    
    -- Deductions
    tax_deduction DECIMAL(10,2) DEFAULT 0,
    provident_fund DECIMAL(10,2) DEFAULT 0,
    leave_deduction DECIMAL(10,2) DEFAULT 0,
    other_deductions DECIMAL(10,2) DEFAULT 0,
    total_deductions DECIMAL(10,2) DEFAULT 0,
    
    net_salary DECIMAL(10,2) NOT NULL,
    payment_date DATE,
    payment_status ENUM('Pending', 'Paid', 'Unpaid') DEFAULT 'Pending',
    generated_by BINARY(16) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- BENEFITS MANAGEMENT
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

-- TRAINING & DEVELOPMENT
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

-- RECRUITMENT MANAGEMENT
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

-- ONBOARDING & OFFBOARDING
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

-- ASSETS MANAGEMENT
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

-- NOTICE MANAGEMENT
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

-- NOTIFICATIONS MANAGEMENT
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

-- ADD ALL FOREIGN KEY CONSTRAINTS
ALTER TABLE college ADD FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;

ALTER TABLE department 
ADD FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
ADD FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE SET NULL,
ADD FOREIGN KEY (manager_id) REFERENCES employee(id) ON DELETE SET NULL;

ALTER TABLE designations ADD FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE;
ALTER TABLE designations ADD FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE SET NULL;

ALTER TABLE employee 
ADD FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
ADD FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE,
ADD FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE CASCADE,
ADD FOREIGN KEY (manager_id) REFERENCES employee(id) ON DELETE SET NULL;

ALTER TABLE employee_personal ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employee_employment ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employee_academic ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employee_academic ADD FOREIGN KEY (college_id) REFERENCES college(id) ON DELETE SET NULL;
ALTER TABLE employee_hr ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employee_outsource ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employee_outsource ADD FOREIGN KEY (outsourcing_company_id) REFERENCES outsourcing_companies(id) ON DELETE CASCADE;
ALTER TABLE outsourcing_companies ADD FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE users ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employee_shift ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employee_shift ADD FOREIGN KEY (shift_id) REFERENCES shift_schedule(id) ON DELETE CASCADE;
ALTER TABLE leave_balance ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE leave_balance ADD FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;
ALTER TABLE leave_request ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE leave_request ADD FOREIGN KEY (leave_type_id) REFERENCES leave_types(id) ON DELETE CASCADE;
ALTER TABLE leave_request ADD FOREIGN KEY (approved_by) REFERENCES employee(id) ON DELETE SET NULL;
ALTER TABLE payroll ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE payroll ADD FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE training_sessions ADD FOREIGN KEY (training_program_id) REFERENCES training_programs(id) ON DELETE CASCADE;
ALTER TABLE training_participants ADD FOREIGN KEY (training_session_id) REFERENCES training_sessions(id) ON DELETE CASCADE;
ALTER TABLE training_participants ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE recruitment ADD FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE;
ALTER TABLE recruitment ADD FOREIGN KEY (designation_id) REFERENCES designations(id) ON DELETE CASCADE;
ALTER TABLE recruitment ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE applicant ADD FOREIGN KEY (recruitment_id) REFERENCES recruitment(id) ON DELETE CASCADE;
ALTER TABLE interview_schedule ADD FOREIGN KEY (applicant_id) REFERENCES applicant(id) ON DELETE CASCADE;
ALTER TABLE onboarding_checklist ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE onboarding_checklist ADD FOREIGN KEY (assigned_to) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE offboarding ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE assets ADD FOREIGN KEY (asset_category_id) REFERENCES asset_category(id) ON DELETE CASCADE;
ALTER TABLE asset_assignment ADD FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE;
ALTER TABLE asset_assignment ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE asset_assignment ADD FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE employee_benefits ADD FOREIGN KEY (employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employee_benefits ADD FOREIGN KEY (benefit_id) REFERENCES benefits(id) ON DELETE CASCADE;
ALTER TABLE notices ADD FOREIGN KEY (target_department_id) REFERENCES department(id) ON DELETE CASCADE;
ALTER TABLE notices ADD FOREIGN KEY (target_employee_id) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE notices ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idx_employee_department ON employee(department_id);
CREATE INDEX idx_employee_designation ON employee(designation_id);
CREATE INDEX idx_employee_manager ON employee(manager_id);
CREATE INDEX idx_employee_status ON employee(employment_status);
CREATE INDEX idx_employee_type ON employee(employee_type);
CREATE INDEX idx_employee_role ON employee(employee_role);
CREATE INDEX idx_employee_company ON employee(company_id);
CREATE INDEX idx_company_status ON company(status);
CREATE INDEX idx_college_company ON college(company_id);
CREATE INDEX idx_department_company ON department(company_id);
CREATE INDEX idx_outsourcing_company_company ON outsourcing_companies(company_id);
CREATE INDEX idx_designation_department ON designations(department_id);
CREATE INDEX idx_designation_college ON designations(college_id);
CREATE INDEX idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX idx_leave_request_employee ON leave_request(employee_id);
CREATE INDEX idx_leave_request_status ON leave_request(status);
CREATE INDEX idx_payroll_employee_period ON payroll(employee_id, pay_period_start);
CREATE INDEX idx_recruitment_status ON recruitment(status);
CREATE INDEX idx_applicant_recruitment_status ON applicant(recruitment_id, status);
CREATE INDEX idx_asset_status ON assets(status);
CREATE INDEX idx_notices_publish ON notices(publish_date, is_published);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_employee_personal_employee ON employee_personal(employee_id);
CREATE INDEX idx_employee_employment_employee ON employee_employment(employee_id);
CREATE INDEX idx_employee_academic_employee ON employee_academic(employee_id);
CREATE INDEX idx_employee_hr_employee ON employee_hr(employee_id);
CREATE INDEX idx_employee_outsource_employee ON employee_outsource(employee_id);
CREATE INDEX idx_department_type ON department(department_type);
CREATE INDEX idx_designation_type ON designations(designation_type);
CREATE INDEX idx_department_college ON department(college_id);

-- UNIQUE CONSTRAINTS FOR ONE-TO-ONE RELATIONSHIPS
ALTER TABLE employee_personal ADD UNIQUE KEY unique_employee_personal (employee_id);
ALTER TABLE employee_employment ADD UNIQUE KEY unique_employee_employment (employee_id);
ALTER TABLE employee_academic ADD UNIQUE KEY unique_employee_academic (employee_id);
ALTER TABLE employee_hr ADD UNIQUE KEY unique_employee_hr (employee_id);
ALTER TABLE employee_outsource ADD UNIQUE KEY unique_employee_outsource (employee_id);
ALTER TABLE company ADD CONSTRAINT unique_company_email UNIQUE (company_email);
ALTER TABLE company ADD CONSTRAINT unique_company_phone UNIQUE (company_phone);
ALTER TABLE college ADD CONSTRAINT unique_college_per_company UNIQUE (company_id, college_name);
ALTER TABLE department ADD CONSTRAINT unique_department_per_company UNIQUE (company_id, department_name);
ALTER TABLE designations ADD CONSTRAINT unique_designation_per_department UNIQUE (department_id, title);


-- VALIDATION TRIGGERS
DELIMITER //

-- Department validation for college requirement
CREATE TRIGGER validate_department_college_requirement
BEFORE INSERT ON department
FOR EACH ROW
BEGIN
    -- If department type is academic, college_id must be provided
    IF NEW.department_type = 'academic' AND NEW.college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic departments must be associated with a college';
    END IF;
    
    -- If department type is not academic, college_id should be NULL
    IF NEW.department_type != 'academic' AND NEW.college_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Non-academic departments cannot be associated with a college';
    END IF;
END//

CREATE TRIGGER validate_department_college_requirement_update
BEFORE UPDATE ON department
FOR EACH ROW
BEGIN
    -- If department type is academic, college_id must be provided
    IF NEW.department_type = 'academic' AND NEW.college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic departments must be associated with a college';
    END IF;
    
    -- If department type is not academic, college_id should be NULL
    IF NEW.department_type != 'academic' AND NEW.college_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Non-academic departments cannot be associated with a college';
    END IF;
END//

-- Employee validation
CREATE TRIGGER validate_employee_type_consistency
BEFORE INSERT ON employee
FOR EACH ROW
BEGIN
    DECLARE dept_type ENUM('academic', 'administrative', 'support', 'hr');
    
    IF NEW.manager_id IS NOT NULL AND NEW.manager_id = NEW.id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee cannot be their own manager';
    END IF;
    
    -- Get department type
    SELECT department_type INTO dept_type 
    FROM department 
    WHERE id = NEW.department_id;
    
    -- Validate employee type matches department type
    IF NEW.employee_type = 'academic' AND dept_type != 'academic' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic employees must be assigned to academic departments';
    END IF;
    
    IF NEW.employee_type = 'hr_officer' AND dept_type != 'hr' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HR officers must be assigned to HR departments';
    END IF;
    
    -- Outsource employees can be in any department type
END//

CREATE TRIGGER validate_employee_type_consistency_update
BEFORE UPDATE ON employee
FOR EACH ROW
BEGIN
    DECLARE dept_type ENUM('academic', 'administrative', 'support', 'hr');
    
    IF NEW.manager_id IS NOT NULL AND NEW.manager_id = NEW.id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee cannot be their own manager';
    END IF;
    
    -- Only validate if department is being changed
    IF NEW.department_id != OLD.department_id THEN
        -- Get department type
        SELECT department_type INTO dept_type 
        FROM department 
        WHERE id = NEW.department_id;
        
        -- Validate employee type matches department type
        IF NEW.employee_type = 'academic' AND dept_type != 'academic' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Academic employees must be assigned to academic departments';
        END IF;
        
        IF NEW.employee_type = 'hr_officer' AND dept_type != 'hr' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'HR officers must be assigned to HR departments';
        END IF;
    END IF;
END//

-- Trigger to validate academic employees have college assigned
CREATE TRIGGER validate_academic_employee_consistency
AFTER INSERT ON employee_academic
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    DECLARE emp_college_id BINARY(16);
    
    SELECT e.employee_type, ea.college_id INTO emp_type, emp_college_id
    FROM employee e
    LEFT JOIN employee_academic ea ON e.id = ea.employee_id
    WHERE e.id = NEW.employee_id;
    
    IF emp_type = 'academic' AND emp_college_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic employees must have a college assigned in employee_academic table';
    END IF;
END//

-- Trigger to validate outsourced employees have outsourcing company assigned
CREATE TRIGGER validate_outsource_employee_consistency
AFTER INSERT ON employee_outsource
FOR EACH ROW
BEGIN
    DECLARE emp_type ENUM('academic', 'hr_officer', 'outsource');
    SELECT employee_type INTO emp_type FROM employee WHERE id = NEW.employee_id;
    
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
    SELECT employee_type INTO emp_type FROM employee WHERE id = NEW.employee_id;
    
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
    SELECT employee_type INTO emp_type FROM employee WHERE id = NEW.employee_id;
    
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
    SELECT employee_type INTO emp_type FROM employee WHERE id = NEW.employee_id;
    
    IF emp_type != 'outsource' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Outsource information can only be added for outsourced employees';
    END IF;
END//

DELIMITER ;

-- UPDATED BILINGUAL VIEW
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
    eh.hr_specialization, eh.hr_level,
    d.department_name, d.department_name_amharic,
    d.department_type,
    des.title as designation_title, des.title_amharic as designation_title_amharic,
    des.designation_type,
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
LEFT JOIN employee_hr eh ON e.id = eh.employee_id
LEFT JOIN department d ON e.department_id = d.id
LEFT JOIN designations des ON e.designation_id = des.id
LEFT JOIN users u ON e.id = u.employee_id;

-- VIEW FOR DEPARTMENT-COLLEGE RELATIONSHIPS
CREATE VIEW department_college_view AS
SELECT 
    d.id,
    d.department_name,
    d.department_name_amharic,
    d.department_type,
    c.college_name,
    c.college_name_amharic,
    CASE 
        WHEN d.department_type = 'academic' THEN 'College Required'
        ELSE 'No College Association'
    END as college_requirement_status
FROM department d
LEFT JOIN college c ON d.college_id = c.id;

-- FUNCTION TO CALCULATE LEAVE DEDUCTION FOR PAYROLL
DELIMITER //
CREATE FUNCTION calculate_leave_deduction(employee_id BINARY(16), pay_period_start DATE, pay_period_end DATE)
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_leave_days INT;
    DECLARE daily_salary DECIMAL(10,2);
    DECLARE leave_deduction DECIMAL(10,2);
    
    -- Get total approved leave days in the pay period
    SELECT COALESCE(SUM(total_days), 0) INTO total_leave_days
    FROM leave_request 
    WHERE employee_id = employee_id 
    AND status = 'approved'
    AND start_date <= pay_period_end 
    AND end_date >= pay_period_start;
    
    -- Get daily salary (assuming 22 working days per month)
    SELECT COALESCE(salary, 0) / 22 INTO daily_salary
    FROM employee_employment 
    WHERE employee_id = employee_id;
    
    -- Calculate deduction
    SET leave_deduction = total_leave_days * daily_salary;
    
    RETURN leave_deduction;
END//
DELIMITER ;
