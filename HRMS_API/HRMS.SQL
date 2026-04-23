CREATE DATABASE IF NOT EXISTS HRMS;
USE HRMS;
SET time_zone = '+03:00';

-- ORGANIZATION STRUCTURE
CREATE TABLE company (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    companyName VARCHAR(100) NOT NULL,
    companyNameAmharic VARCHAR(100),
    companyAddress TEXT,
    companyAddressAmharic TEXT,
    companyPhone VARCHAR(20) UNIQUE,
    companyEmail VARCHAR(50) UNIQUE,
    companyWebsite VARCHAR(100) NULL,
    companyLogo VARCHAR(255) NULL,
    companyEstablishedDate DATE,
    companyTinNumber VARCHAR(50),
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- OUTSOURCING VENDORS
CREATE TABLE outsourcingCompanies (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    companyId BINARY(16) NOT NULL,
    companyName VARCHAR(100) NOT NULL,
    companyNameAmharic VARCHAR(100),
    companyAddress TEXT,
    companyAddressAmharic TEXT,
    companyPhone VARCHAR(20),
    companyEmail VARCHAR(100),
    companyServiceType ENUM('SECURITY', 'CLEANING', 'MAINTENANCE', 'OTHER') NOT NULL,
    companyContractStartDate DATE,
    companyContractEndDate DATE,
    companyStatus ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED') DEFAULT 'ACTIVE',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- COLLEGE
CREATE TABLE college (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    companyId BINARY(16) NOT NULL,
    collegeName VARCHAR(100) NOT NULL,
    collegeNameAmharic VARCHAR(100),
    collegeDescription TEXT NULL,
    collegeDescriptionAmharic TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- DEPARTMENT WITH TYPE
CREATE TABLE department (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    companyId BINARY(16) NOT NULL,
    collegeId BINARY(16) NULL,
    parentDepartmentId BINARY(16) NULL,
    departmentName VARCHAR(100) NOT NULL,
    departmentLevel INT DEFAULT 1,
    departmentNameAmharic VARCHAR(100),
    departmentDescription TEXT NULL,
    departmentDescriptionAmharic TEXT NULL,
    departmentType ENUM('ACADEMIC', 'ADMINISTRATIVE') NOT NULL,
    managerId BINARY(16),
    departmentStatus ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


-- SINGLE EMPLOYEE TABLE WITH ROLE 
CREATE TABLE employee (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeCode VARCHAR(50) UNIQUE NOT NULL,
    companyId BINARY(16) NOT NULL,
    employeeType ENUM('ACADEMIC', 'ADMINISTRATIVE', 'OUTSOURCE') NOT NULL,
    employeeRole ENUM('HRMANAGER', 'DEAN', 'HEAD', 'HROFFICER', 'RECRUITER', 'PAYROLLOFFICER', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
    departmentId BINARY(16)  NULL,
    managerId BINARY(16),
    hireDate DATE NOT NULL,
    employmentType ENUM('FULLTIME', 'PARTTIME', 'CONTRACT', 'INTERN') NOT NULL DEFAULT 'FULLTIME',
    employmentStatus ENUM('ACTIVE', 'ONLEAVE', 'TERMINATED', 'RESIGNED') DEFAULT 'ACTIVE',
    terminationDate DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE employeePersonal (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    firstNameAmharic VARCHAR(100),
    middleName VARCHAR(100),
    middleNameAmharic VARCHAR(100),
    lastName VARCHAR(100) NOT NULL,
    lastNameAmharic VARCHAR(100),
    gender VARCHAR(20),
    dateOfBirth DATE,
    personalEmail VARCHAR(100) UNIQUE,
    personalPhone VARCHAR(20) UNIQUE,
    emergencyContactName VARCHAR(100) NULL,
    emergencyContactNameAmharic VARCHAR(100) NULL,
    emergencyContactPhone VARCHAR(20) NULL,
    profilePicture VARCHAR(500) NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE employeeEmployment (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    officialEmail VARCHAR(100),
    officialPhone VARCHAR(20),
    salary DECIMAL(10,2),
    qualification VARCHAR(100),
    qualificationAmharic VARCHAR(100),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE employeeAcademic (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    collegeId BINARY(16),
    academicRank VARCHAR(50),
    academicRankAmharic VARCHAR(50),
    academicStatus ENUM('ACTIVE', 'ONLEAVE', 'SABBATICAL') DEFAULT 'ACTIVE',
    fieldOfSpecialization VARCHAR(100),
    fieldOfSpecializationAmharic VARCHAR(100),
    FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE
);

CREATE TABLE employeeOutsource (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    outsourcingCompanyId BINARY(16) NOT NULL,
    contractStartDate DATE,
    contractEndDate DATE,
    serviceType ENUM('SECURITY', 'CLEANING', 'IT', 'CATERING', 'MAINTENANCE', 'OTHER') NOT NULL,
    FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE
);

-- Create employeeDocuments table for ID documents and other documents
CREATE TABLE employeeDocuments (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    documentType ENUM('IDDOCUMENT', 'EDUCATION', 'CERTIFICATION', 'CONTRACT', 'OTHER') NOT NULL,
    documentName VARCHAR(100) NOT NULL,
    documentNameAmharic VARCHAR(255),
    fileName VARCHAR(100) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileSize INT,
    mimeType VARCHAR(100),
    issueDate DATE,
    expiryDate DATE,
    issuingAuthority VARCHAR(255),
    description TEXT,
    descriptionAmharic TEXT,
    isVerified BOOLEAN DEFAULT FALSE,
    verifiedBy BINARY(16),
    verifiedAt TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE,
    FOREIGN KEY (verifiedBy) REFERENCES employee(id) ON DELETE SET NULL
);

-- Create employeeEducation table for structured education data
CREATE TABLE employeeEducation (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    institutionName VARCHAR(100) NOT NULL,
    institutionNameAmharic VARCHAR(100),
    qualification VARCHAR(100) NOT NULL,
    qualificationAmharic VARCHAR(100),
    fieldOfStudy VARCHAR(100),
    fieldOfStudyAmharic VARCHAR(100),
    startDate DATE NOT NULL,
    endDate DATE,
    graduationDate DATE,
    grade VARCHAR(50),
    description TEXT,
    descriptionAmharic TEXT,
    documentId BINARY(16), -- Reference to document in employeeDocuments
    isVerified BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE,
    FOREIGN KEY (documentId) REFERENCES employeeDocuments(id) ON DELETE SET NULL
);

-- DESIGNATION WITH ASSIGNED EMPLOYEE
CREATE TABLE designations (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    departmentId BINARY(16),
    collegeId BINARY(16),
    title VARCHAR(100) NOT NULL,
    titleAmharic VARCHAR(100),
    jobDescription TEXT,
    jobDescriptionAmharic TEXT,
    gradeLevel VARCHAR(50),
    minSalary DECIMAL(10,2),
    maxSalary DECIMAL(10,2),
    designationType ENUM('ACADEMIC', 'ADMINISTRATIVE', 'HR', 'SUPPORT') DEFAULT 'ADMINISTRATIVE',
    status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uqDesignationEmployee (employeeId),
    FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE
);

-- USER AUTHENTICATION
CREATE TABLE users(
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    systemRole ENUM('HRMANAGER', 'DEAN', 'HEAD', 'HROFFICER', 'RECRUITER', 'PAYROLLOFFICER', 'EMPLOYEE') DEFAULT 'EMPLOYEE',
    passwordHash VARCHAR(255) NOT NULL,
    preferredLanguage ENUM('EN', 'AM') DEFAULT 'AM',
    lastLogin TIMESTAMP NULL,
    mustChangePassword BOOLEAN DEFAULT FALSE,
    passwordChangedAt TIMESTAMP NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ATTENDANCE MANAGEMENT
CREATE TABLE attendance (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    Date DATE NOT NULL,
    checkIn TIME,
    checkOut TIME,
    status ENUM('PRESENT', 'LATE', 'ABSENT', 'HALFDAY', 'HOLIDAY', 'WEEKEND') DEFAULT 'ABSENT',
    lateMinutes INT DEFAULT 0,
    overtimeMinutes INT DEFAULT 0,
    notes TEXT,
    notesAmharic TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    shiftId BINARY(16) NOT NULL,
    UNIQUE KEY uniqueEmployeeDateShift (employeeId, Date, shiftId)
);

CREATE TABLE shiftSchedule (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    shiftName VARCHAR(100) NOT NULL,
    shiftNameAmharic VARCHAR(100),
    startTime TIME NOT NULL,
    endTime TIME NOT NULL,
    breakDurationMinutes INT DEFAULT 60,
    description TEXT,
    descriptionAmharic TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employeeShift (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    shiftId BINARY(16) NOT NULL,
    effectiveDate DATE NOT NULL,
    endDate DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- LEAVE MANAGEMENT
CREATE TABLE leaveBalance (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    leaveType ENUM('ANNUAL', 'SICK', 'MEDICAL', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'ORGANIZATION_LEAVE') NOT NULL,
    year INT NOT NULL,
    totalAllocatedDays INT NOT NULL,
    usedDays INT DEFAULT 0,
    remainingDays INT NOT NULL,
    carryForwardDays INT DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniqueEmployeeLeaveYear (employeeId, leaveType, year)
);

CREATE TABLE leaveRequest (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    leaveType ENUM('ANNUAL', 'SICK', 'MEDICAL', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'ORGANIZATION_LEAVE') NOT NULL,
    startDate DATE NOT NULL,
    endDate DATE NOT NULL,
    totalDays INT NOT NULL,
    reason TEXT,
    reasonAmharic TEXT,
    supportDocument VARCHAR(255) NULL,
    status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
    approvedBy BINARY(16),
    approvedAt TIMESTAMP NULL,
    comments TEXT,
    commentsAmharic TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- SIMPLIFIED PAYROLL TABLE FOR PAYSLIP GENERATION
CREATE TABLE payroll (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    payPeriodStart DATE NOT NULL,
    payPeriodEnd DATE NOT NULL,
    
    -- Earnings
    basicSalary DECIMAL(10,2) NOT NULL,
    houseRentAllowance DECIMAL(10,2) DEFAULT 0,
    travelAllowance DECIMAL(10,2) DEFAULT 0,
    medicalAllowance DECIMAL(10,2) DEFAULT 0,
    overtimeAllowance DECIMAL(10,2) DEFAULT 0,
    otherAllowances DECIMAL(10,2) DEFAULT 0,
    totalEarnings DECIMAL(10,2) NOT NULL,
    
    -- Deductions
    taxDeduction DECIMAL(10,2) DEFAULT 0,
    providentFund DECIMAL(10,2) DEFAULT 0,
    leaveDeduction DECIMAL(10,2) DEFAULT 0,
    otherDeductions DECIMAL(10,2) DEFAULT 0,
    totalDeductions DECIMAL(10,2) DEFAULT 0,
    
    netSalary DECIMAL(10,2) NOT NULL,
    paymentDate DATE,
    paymentStatus ENUM('PENDING', 'PAID', 'UNPAID') DEFAULT 'PENDING',
    generatedBy BINARY(16) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- BENEFITS MANAGEMENT
CREATE TABLE benefits (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    benefitName VARCHAR(255) NOT NULL,
    benefitNameAmharic VARCHAR(255),
    description TEXT,
    descriptionAmharic TEXT,
    benefitType ENUM('HEALTH', 'RETIREMENT', 'INSURANCE', 'WELLNESS', 'OTHER') NOT NULL,
    costToCompany DECIMAL(10,2),
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE employeeBenefits (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    benefitId BINARY(16) NOT NULL,
    enrollmentDate DATE NOT NULL,
    coverageAmount DECIMAL(10,2),
    employeeContribution DECIMAL(10,2),
    companyContribution DECIMAL(10,2),
    status ENUM('ACTIVE', 'CANCELLED', 'SUSPENDED') DEFAULT 'ACTIVE',
    endDate DATE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- TRAINING & DEVELOPMENT
CREATE TABLE trainingPrograms (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    programName VARCHAR(255) NOT NULL,
    programNameAmharic VARCHAR(255),
    description TEXT,
    descriptionAmharic TEXT,
    trainerName VARCHAR(255),
    trainerNameAmharic VARCHAR(255),
    durationHours INT,
    cost DECIMAL(10,2),
    status ENUM('DRAFT', 'SCHEDULED', 'COMPLETED', 'CANCELLED') DEFAULT 'DRAFT',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trainingSessions (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    trainingProgramId BINARY(16) NOT NULL,
    sessionDate DATE NOT NULL,
    startTime TIME,
    endTime TIME,
    location VARCHAR(255),
    locationAmharic VARCHAR(255),
    maxParticipants INT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE trainingParticipants (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    trainingSessionId BINARY(16) NOT NULL,
    employeeId BINARY(16) NOT NULL,
    status ENUM('REGISTERED', 'ATTENDED', 'ABSENT', 'COMPLETED') DEFAULT 'REGISTERED',
    feedback TEXT,
    feedbackAmharic TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- RECRUITMENT MANAGEMENT
CREATE TABLE recruitment (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    jobTitle VARCHAR(255) NOT NULL,
    jobTitleAmharic VARCHAR(255),
    departmentId BINARY(16) NOT NULL,
    designationId BINARY(16) NOT NULL,
    jobDescription TEXT,
    jobDescriptionAmharic TEXT,
    requirements TEXT,
    requirementsAmharic TEXT,
    vacancies INT NOT NULL,
    experienceRequired VARCHAR(100),
    salaryRange VARCHAR(100),
    status ENUM('DRAFT', 'OPEN', 'CLOSED', 'CANCELLED') DEFAULT 'DRAFT',
    postedDate DATE,
    closingDate DATE,
    createdBy BINARY(16) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE applicant (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    recruitmentId BINARY(16) NOT NULL,
    firstName VARCHAR(100) NOT NULL,
    firstNameAmharic VARCHAR(100),
    lastName VARCHAR(100) NOT NULL,
    lastNameAmharic VARCHAR(100),
    email VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    resumeUrl VARCHAR(255),
    coverLetter TEXT,
    coverLetterAmharic TEXT,
    currentCompany VARCHAR(255),
    currentPosition VARCHAR(255),
    totalExperience DECIMAL(3,1),
    currentSalary DECIMAL(10,2),
    expectedSalary DECIMAL(10,2),
    noticePeriod INT,
    status ENUM('APPLIED', 'SCREENING', 'INTERVIEW', 'OFFERED', 'REJECTED', 'HIRED') DEFAULT 'APPLIED',
    appliedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE interviewSchedule (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    applicantId BINARY(16) NOT NULL,
    interviewDate DATE NOT NULL,
    interviewTime TIME NOT NULL,
    interviewType ENUM('PHONE', 'VIDEO', 'INPERSON') NOT NULL,
    interviewers JSON,
    location VARCHAR(255),
    locationAmharic VARCHAR(255),
    status ENUM('SCHEDULED', 'COMPLETED', 'CANCELLED', 'NOSHOW') DEFAULT 'SCHEDULED',
    feedback TEXT,
    feedbackAmharic TEXT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ONBOARDING & OFFBOARDING
CREATE TABLE onboardingChecklist (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    taskName VARCHAR(255) NOT NULL,
    taskNameAmharic VARCHAR(255),
    assignedTo BINARY(16) NOT NULL,
    dueDate DATE,
    status ENUM('PENDING', 'INPROGRESS', 'COMPLETED') DEFAULT 'PENDING',
    completedDate DATE,
    notes TEXT,
    notesAmharic TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE offboarding (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    employeeId BINARY(16) NOT NULL,
    separationDate DATE NOT NULL,
    separationType ENUM('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'ENDOFCONTRACT') NOT NULL,
    reason TEXT,
    reasonAmharic TEXT,
    exitInterviewNotes TEXT,
    exitInterviewNotesAmharic TEXT,
    lastWorkingDate DATE,
    status ENUM('INITIATED', 'INPROGRESS', 'COMPLETED') DEFAULT 'INITIATED',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ASSETS MANAGEMENT
CREATE TABLE assetCategory (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    categoryName VARCHAR(255) NOT NULL,
    categoryNameAmharic VARCHAR(255),
    description TEXT,
    descriptionAmharic TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    assetName VARCHAR(255) NOT NULL,
    assetNameAmharic VARCHAR(255),
    assetCategoryId BINARY(16) NOT NULL,
    serialNumber VARCHAR(100) UNIQUE,
    model VARCHAR(100),
    purchaseDate DATE,
    purchaseCost DECIMAL(10,2),
    currentValue DECIMAL(10,2),
    status ENUM('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'DISPOSED') DEFAULT 'AVAILABLE',
    location VARCHAR(255),
    locationAmharic VARCHAR(255),
    notes TEXT,
    notesAmharic TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE assetAssignment (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    assetId BINARY(16) NOT NULL,
    employeeId BINARY(16) NOT NULL,
    assignedDate DATE NOT NULL,
    expectedReturnDate DATE,
    actualReturnDate DATE,
    assignmentReason TEXT,
    assignmentReasonAmharic TEXT,
    conditionAssigned TEXT,
    conditionAssignedAmharic TEXT,
    conditionReturned TEXT,
    conditionReturnedAmharic TEXT,
    status ENUM('ASSIGNED', 'RETURNED', 'OVERDUE') DEFAULT 'ASSIGNED',
    assignedBy BINARY(16) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- NOTICE MANAGEMENT
CREATE TABLE notices (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    title VARCHAR(255) NOT NULL,
    titleAmharic VARCHAR(255),
    content TEXT NOT NULL,
    contentAmharic TEXT,
    noticeType ENUM('GENERAL', 'POLICY', 'EVENT', 'URGENT') DEFAULT 'GENERAL',
    targetAudience ENUM('ALL', 'DEPARTMENT', 'INDIVIDUAL') DEFAULT 'ALL',
    targetDepartmentId BINARY(16),
    targetEmployeeId BINARY(16),
    publishDate DATE NOT NULL,
    expiryDate DATE,
    isPublished BOOLEAN DEFAULT FALSE,
    createdBy BINARY(16) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- NOTIFICATIONS MANAGEMENT
CREATE TABLE notifications (
    id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID())),
    userId BINARY(16) NOT NULL,
    title VARCHAR(255) NOT NULL,
    titleAmharic VARCHAR(255),
    message TEXT NOT NULL,
    messageAmharic TEXT,
    notificationType ENUM('INFO', 'WARNING', 'SUCCESS', 'ERROR') DEFAULT 'INFO',
    relatedModule ENUM('ATTENDANCE', 'LEAVE', 'PAYROLL', 'RECRUITMENT', 'PERFORMANCE', 'GENERAL') DEFAULT 'GENERAL',
    relatedId BINARY(16),
    isRead BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ADD ALL FOREIGN KEY CONSTRAINTS
ALTER TABLE college ADD FOREIGN KEY (companyId) REFERENCES company(id) ON DELETE CASCADE;

ALTER TABLE department 
ADD FOREIGN KEY (companyId) REFERENCES company(id) ON DELETE CASCADE,
ADD FOREIGN KEY (collegeId) REFERENCES college(id) ON DELETE SET NULL,
ADD FOREIGN KEY (managerId) REFERENCES employee(id) ON DELETE SET NULL;

ALTER TABLE designations ADD FOREIGN KEY (departmentId) REFERENCES department(id) ON DELETE CASCADE;
ALTER TABLE designations ADD FOREIGN KEY (collegeId) REFERENCES college(id) ON DELETE SET NULL;

ALTER TABLE employee 
ADD FOREIGN KEY (companyId) REFERENCES company(id) ON DELETE CASCADE,
ADD FOREIGN KEY (departmentId) REFERENCES department(id) ON DELETE CASCADE,
ADD FOREIGN KEY (managerId) REFERENCES employee(id) ON DELETE SET NULL;

ALTER TABLE employeePersonal ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employeeEmployment ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employeeAcademic ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employeeAcademic ADD FOREIGN KEY (collegeId) REFERENCES college(id) ON DELETE SET NULL;
ALTER TABLE employeeOutsource ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employeeOutsource ADD FOREIGN KEY (outsourcingCompanyId) REFERENCES outsourcingCompanies(id) ON DELETE CASCADE;
ALTER TABLE outsourcingCompanies ADD FOREIGN KEY (companyId) REFERENCES company(id) ON DELETE CASCADE;
ALTER TABLE users ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE attendance ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employeeShift ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employeeShift ADD FOREIGN KEY (shiftId) REFERENCES shiftSchedule(id) ON DELETE CASCADE;
ALTER TABLE leaveBalance ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE leaveRequest ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE leaveRequest ADD FOREIGN KEY (approvedBy) REFERENCES employee(id) ON DELETE SET NULL;
ALTER TABLE payroll ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE payroll ADD FOREIGN KEY (generatedBy) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE trainingSessions ADD FOREIGN KEY (trainingProgramId) REFERENCES trainingPrograms(id) ON DELETE CASCADE;
ALTER TABLE trainingParticipants ADD FOREIGN KEY (trainingSessionId) REFERENCES trainingSessions(id) ON DELETE CASCADE;
ALTER TABLE trainingParticipants ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE recruitment ADD FOREIGN KEY (departmentId) REFERENCES department(id) ON DELETE CASCADE;
ALTER TABLE recruitment ADD FOREIGN KEY (designationId) REFERENCES designations(id) ON DELETE CASCADE;
ALTER TABLE recruitment ADD FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE applicant ADD FOREIGN KEY (recruitmentId) REFERENCES recruitment(id) ON DELETE CASCADE;
ALTER TABLE interviewSchedule ADD FOREIGN KEY (applicantId) REFERENCES applicant(id) ON DELETE CASCADE;
ALTER TABLE onboardingChecklist ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE onboardingChecklist ADD FOREIGN KEY (assignedTo) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE offboarding ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE assets ADD FOREIGN KEY (assetCategoryId) REFERENCES assetCategory(id) ON DELETE CASCADE;
ALTER TABLE assetAssignment ADD FOREIGN KEY (assetId) REFERENCES assets(id) ON DELETE CASCADE;
ALTER TABLE assetAssignment ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE assetAssignment ADD FOREIGN KEY (assignedBy) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE employeeBenefits ADD FOREIGN KEY (employeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE employeeBenefits ADD FOREIGN KEY (benefitId) REFERENCES benefits(id) ON DELETE CASCADE;
ALTER TABLE notices ADD FOREIGN KEY (targetDepartmentId) REFERENCES department(id) ON DELETE CASCADE;
ALTER TABLE notices ADD FOREIGN KEY (targetEmployeeId) REFERENCES employee(id) ON DELETE CASCADE;
ALTER TABLE notices ADD FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- CREATE INDEXES FOR PERFORMANCE
CREATE INDEX idxEmployeeDepartment ON employee(departmentId);
CREATE INDEX idxEmployeeManager ON employee(managerId);
CREATE INDEX idxEmployeeStatus ON employee(employmentStatus);
CREATE INDEX idxEmployeeType ON employee(employeeType);
CREATE INDEX idxEmployeeRole ON employee(employeeRole);
CREATE INDEX idxEmployeeCompany ON employee(companyId);
CREATE INDEX idxCompanyStatus ON company(status);
CREATE INDEX idxCollegeCompany ON college(companyId);
CREATE INDEX idxDepartmentCompany ON department(companyId);
CREATE INDEX idxOutsourcingCompanyCompany ON outsourcingCompanies(companyId);
CREATE INDEX idxDesignationDepartment ON designations(departmentId);
CREATE INDEX idxDesignationCollege ON designations(collegeId);
CREATE INDEX idxAttendanceEmployeeDate ON attendance(employeeId, date);
CREATE INDEX idxLeaveRequestEmployee ON leaveRequest(employeeId);
CREATE INDEX idxLeaveRequestStatus ON leaveRequest(status);
CREATE INDEX idxPayrollEmployeePeriod ON payroll(employeeId, payPeriodStart);
CREATE INDEX idxRecruitmentStatus ON recruitment(status);
CREATE INDEX idxApplicantRecruitmentStatus ON applicant(recruitmentId, status);
CREATE INDEX idxAssetStatus ON assets(status);
CREATE INDEX idxNoticesPublish ON notices(publishDate, isPublished);
CREATE INDEX idxNotificationsUserRead ON notifications(userId, isRead);
CREATE INDEX idxEmployeePersonalEmployee ON employeePersonal(employeeId);
CREATE INDEX idxEmployeeEmploymentEmployee ON employeeEmployment(employeeId);
CREATE INDEX idxEmployeeAcademicEmployee ON employeeAcademic(employeeId);
CREATE INDEX idxEmployeeOutsourceEmployee ON employeeOutsource(employeeId);
CREATE INDEX idxDepartmentType ON department(departmentType);
CREATE INDEX idxDesignationType ON designations(designationType);
CREATE INDEX idxDepartmentCollege ON department(collegeId);

-- UNIQUE CONSTRAINTS FOR ONE-TO-ONE RELATIONSHIPS
ALTER TABLE employeePersonal ADD UNIQUE KEY uniqueEmployeePersonal (employeeId);
ALTER TABLE employeeEmployment ADD UNIQUE KEY uniqueEmployeeEmployment (employeeId);
ALTER TABLE employeeAcademic ADD UNIQUE KEY uniqueEmployeeAcademic (employeeId);
ALTER TABLE employeeOutsource ADD UNIQUE KEY uniqueEmployeeOutsource (employeeId);
ALTER TABLE company ADD CONSTRAINT uniqueCompanyEmail UNIQUE (companyEmail);
ALTER TABLE company ADD CONSTRAINT uniqueCompanyPhone UNIQUE (companyPhone);
ALTER TABLE college ADD CONSTRAINT uniqueCollegePerCompany UNIQUE (companyId, collegeName);
-- Remove old unique constraint if exists
ALTER TABLE department DROP INDEX uniqueDepartmentPerCompany;
-- Add new unique constraint: for academic departments, uniqueness is (collegeId, departmentName); for administrative, (companyId, departmentName, parentDepartmentId)
CREATE UNIQUE INDEX uniqueAcademicDepartmentPerCollege ON department (collegeId, departmentName) WHERE departmentType = 'ACADEMIC';
CREATE UNIQUE INDEX uniqueAdminDepartmentPerCompanyParent ON department (companyId, departmentName, parentDepartmentId) WHERE departmentType = 'ADMINISTRATIVE';
ALTER TABLE designations ADD CONSTRAINT uniqueDesignationPerDepartment UNIQUE (departmentId, title);


-- VALIDATION TRIGGERS
DELIMITER //

-- Department validation for college requirement
CREATE TRIGGER validateDepartmentCollegeRequirement
BEFORE INSERT ON department
FOR EACH ROW
BEGIN
    -- If department type is academic, collegeId must be provided
    IF NEW.departmentType = 'ACADEMIC' AND NEW.collegeId IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic departments must be associated with a college';
    END IF;
    
    -- If department type is not academic, collegeId should be NULL
    IF NEW.departmentType != 'ACADEMIC' AND NEW.collegeId IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Non-academic departments cannot be associated with a college';
    END IF;
END//

CREATE TRIGGER validateDepartmentCollegeRequirementUpdate
BEFORE UPDATE ON department
FOR EACH ROW
BEGIN
    -- If department type is academic, collegeId must be provided
    IF NEW.departmentType = 'ACADEMIC' AND NEW.collegeId IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic departments must be associated with a college';
    END IF;
    
    -- If department type is not academic, collegeId should be NULL
    IF NEW.departmentType != 'ACADEMIC' AND NEW.collegeId IS NOT NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Non-academic departments cannot be associated with a college';
    END IF;
END//

-- Employee validation
CREATE TRIGGER validateEmployeeTypeConsistency
BEFORE INSERT ON employee
FOR EACH ROW
BEGIN
    DECLARE deptType ENUM('ACADEMIC', 'ADMINISTRATIVE', 'SUPPORT', 'HR');
    
    IF NEW.managerId IS NOT NULL AND NEW.managerId = NEW.id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee cannot be their own manager';
    END IF;
    
    -- Get department type
    SELECT departmentType INTO deptType 
    FROM department 
    WHERE id = NEW.departmentId;
    
    -- Validate employee type matches department type
    IF NEW.employeeType = 'ACADEMIC' AND deptType != 'ACADEMIC' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic employees must be assigned to academic departments';
    END IF;
    
    IF NEW.employeeType = 'HROFFICER' AND deptType != 'HR' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HR officers must be assigned to HR departments';
    END IF;
    
    -- Outsource employees can be in any department type
END//

CREATE TRIGGER validateEmployeeTypeConsistencyUpdate
BEFORE UPDATE ON employee
FOR EACH ROW
BEGIN
    DECLARE deptType ENUM('ACADEMIC', 'ADMINISTRATIVE', 'SUPPORT', 'HR');
    
    IF NEW.managerId IS NOT NULL AND NEW.managerId = NEW.id THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Employee cannot be their own manager';
    END IF;
    
    -- Only validate if department is being changed
    IF NEW.departmentId != OLD.departmentId THEN
        -- Get department type
        SELECT departmentType INTO deptType 
        FROM department 
        WHERE id = NEW.departmentId;
        
        -- Validate employee type matches department type
        IF NEW.employeeType = 'ACADEMIC' AND deptType != 'ACADEMIC' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Academic employees must be assigned to academic departments';
        END IF;
        
        IF NEW.employeeType = 'HROFFICER' AND deptType != 'HR' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'HR officers must be assigned to HR departments';
        END IF;
    END IF;
END//

-- Trigger to validate academic employees have college assigned
CREATE TRIGGER validateAcademicEmployeeConsistency
AFTER INSERT ON employeeAcademic
FOR EACH ROW
BEGIN
    DECLARE empType ENUM('ACADEMIC', 'HROFFICER', 'OUTSOURCE');
    DECLARE empCollegeId BINARY(16);
    
    SELECT e.employeeType, ea.collegeId INTO empType, empCollegeId
    FROM employee e
    LEFT JOIN employeeAcademic ea ON e.id = ea.employeeId
    WHERE e.id = NEW.employeeId;
    
    IF empType = 'ACADEMIC' AND empCollegeId IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic employees must have a college assigned in employeeAcademic table';
    END IF;
END//

-- Trigger to validate outsourced employees have outsourcing company assigned
CREATE TRIGGER validateOutsourceEmployeeConsistency
AFTER INSERT ON employeeOutsource
FOR EACH ROW
BEGIN
    DECLARE empType ENUM('ACADEMIC', 'HROFFICER', 'OUTSOURCE');
    SELECT employeeType INTO empType FROM employee WHERE id = NEW.employeeId;
    
    IF empType != 'outsource' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Outsource info can only be added for outsourced employees';
    END IF;
END//

-- Trigger to prevent wrong employee type data in academic table
CREATE TRIGGER preventWrongTypeAcademic
BEFORE INSERT ON employeeAcademic
FOR EACH ROW
BEGIN
    DECLARE empType ENUM('ACADEMIC', 'HROFFICER', 'OUTSOURCE');
    SELECT employeeType INTO empType FROM employee WHERE id = NEW.employeeId;
    
    IF empType != 'ACADEMIC' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Academic information can only be added for academic employees';
    END IF;
END//

-- Trigger to prevent wrong employee type data in HR table
CREATE TRIGGER preventWrongTypeHr
BEFORE INSERT ON employeeHr
FOR EACH ROW
BEGIN
    DECLARE empType ENUM('ACADEMIC', 'HROFFICER', 'OUTSOURCE');
    SELECT employeeType INTO empType FROM employee WHERE id = NEW.employeeId;
    
    IF empType != 'HROFFICER' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'HR information can only be added for HR officer employees';
    END IF;
END//

-- Trigger to prevent wrong employee type data in outsource table
CREATE TRIGGER preventWrongTypeOutsource
BEFORE INSERT ON employeeOutsource
FOR EACH ROW
BEGIN
    DECLARE empType ENUM('ACADEMIC', 'HROFFICER', 'OUTSOURCE');
    SELECT employeeType INTO empType FROM employee WHERE id = NEW.employeeId;
    
    IF empType != 'outsource' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Outsource information can only be added for outsourced employees';
    END IF;
END//

DELIMITER ;

-- UPDATED BILINGUAL VIEW
CREATE VIEW employeeBilingual AS
SELECT 
    e.*,
    ep.firstName, ep.firstNameAmharic, 
    ep.middleName, ep.middleNameAmharic,
    ep.lastName, ep.lastNameAmharic,
    ep.gender, ep.dateOfBirth,
    ee.officialEmail, ee.officialPhone, ee.salary,
    ea.academicRank, ea.academicRankAmharic,
    ea.fieldOfSpecialization, ea.fieldOfSpecializationAmharic,
    eh.hrSpecialization, eh.hrLevel,
    d.departmentName, d.departmentNameAmharic,
    d.departmentType,
    des.title as designationTitle, des.titleAmharic as designationTitleAmharic,
    des.designationType,
    u.preferredLanguage,
    -- Display names based on preferred language
    CASE 
        WHEN u.preferredLanguage = 'AM' AND ep.firstNameAmharic IS NOT NULL 
        THEN ep.firstNameAmharic 
        ELSE ep.firstName 
    END as displayFirstName,
    CASE 
        WHEN u.preferredLanguage = 'AM' AND ep.lastNameAmharic IS NOT NULL 
        THEN ep.lastNameAmharic 
        ELSE ep.lastName 
    END as displayLastName
FROM employee e
LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
LEFT JOIN employeeEmployment ee ON e.id = ee.employeeId
LEFT JOIN employeeAcademic ea ON e.id = ea.employeeId
LEFT JOIN employeeHr eh ON e.id = eh.employeeId
LEFT JOIN department d ON e.departmentId = d.id
LEFT JOIN designations des ON des.employeeId = e.id
LEFT JOIN users u ON e.id = u.employeeId;

-- VIEW FOR DEPARTMENT-COLLEGE RELATIONSHIPS
CREATE VIEW departmentCollegeView AS
SELECT 
    d.id,
    d.departmentName,
    d.departmentNameAmharic,
    d.departmentType,
    c.collegeName,
    c.collegeNameAmharic,
    CASE 
        WHEN d.departmentType = 'ACADEMIC' THEN 'College Required'
        ELSE 'No College Association'
    END as collegeRequirementStatus
FROM department d
LEFT JOIN college c ON d.collegeId = c.id;

-- FUNCTION TO CALCULATE LEAVE DEDUCTION FOR PAYROLL
DELIMITER //
CREATE FUNCTION calculateLeaveDeduction(employeeId BINARY(16), payPeriodStart DATE, payPeriodEnd DATE)
RETURNS DECIMAL(10,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE totalLeaveDays INT;
    DECLARE dailySalary DECIMAL(10,2);
    DECLARE leaveDeduction DECIMAL(10,2);
    
    -- Get total approved leave days in the pay period
    SELECT COALESCE(SUM(totalDays), 0) INTO totalLeaveDays
    FROM leaveRequest 
    WHERE employeeId = employeeId 
    AND status = 'APPROVED'
    AND startDate <= payPeriodEnd 
    AND endDate >= payPeriodStart;
    
    -- Get daily salary (assuming 22 working days per month)
    SELECT COALESCE(salary, 0) / 22 INTO dailySalary
    FROM employeeEmployment 
    WHERE employeeId = employeeId;
    
    -- Calculate deduction
    SET leaveDeduction = totalLeaveDays * dailySalary;
    
    RETURN leaveDeduction;
END//
DELIMITER ;
