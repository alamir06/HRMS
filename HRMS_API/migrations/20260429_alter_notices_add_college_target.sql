-- Migration: Add COLLEGE to targetAudience enum and add targetCollegeId column to notices table
-- Date: 2026-04-29

ALTER TABLE notices
MODIFY COLUMN targetAudience ENUM('ALL', 'DEPARTMENT', 'INDIVIDUAL', 'COLLEGE') DEFAULT 'ALL';

ALTER TABLE notices
ADD COLUMN targetCollegeId BINARY(16) AFTER targetDepartmentId;