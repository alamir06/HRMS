/*
  Migration: Allow departmentId to be NULL for administrative recruitment entries.
  This script modifies the recruitment table column definition.
*/
ALTER TABLE recruitment
  MODIFY departmentId BINARY(16) NULL;
