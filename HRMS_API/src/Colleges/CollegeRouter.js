import express from 'express';
import { createCrudRouter } from '../Commons/CommonRouter.js';
import { collegeValidationSchema } from './CollegeValidation.js';
import { authenticateToken, authorize } from '../../middleware/auth.js';
import collegeCustomController from "./CollegeController.js"

const collegeRouter = express.Router();
const collegeCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "college",
  validationSchema: collegeValidationSchema,
  uuidEnabled: true,
  uuidFields: ["id", "company_id"],
  createRoles: ["admin", "super_admin", "hr_manager"],
  readRoles: null,
  updateRoles: ["admin", "super_admin", "hr_manager"],
  deleteRoles: ["super_admin"],
});

collegeRouter.use('/', collegeCrudRouter);


collegeRouter.get('/company/:companyId',
  authenticateToken,
  authorize('admin', 'super_admin', 'hr_manager', 'user'),
  collegeCustomController.getCollegesByCompany
);

// Statistics
collegeRouter.get('/stats/dashboard',
  authenticateToken,
  authorize('admin', 'super_admin', 'hr_manager'),
  collegeCustomController.getCollegeStats
);

// Bulk operations
collegeRouter.post('/bulk/create',
  authenticateToken,
  authorize('admin', 'super_admin'),
  collegeCustomController.bulkCreateColleges
);

// Search operations
collegeRouter.get('/search/global',
  authenticateToken,
  authorize('admin', 'super_admin', 'hr_manager', 'user'),
  collegeCustomController.searchColleges
);

// Validation
collegeRouter.get('/validate/name',
  authenticateToken,
  authorize('admin', 'super_admin', 'hr_manager'),
  collegeCustomController.validateCollegeName
);

// Get college with company details
collegeRouter.get('/:id/with-company',
  // authenticateToken,
  // authorize('admin', 'super_admin', 'hr_manager', 'user'),
  collegeCustomController.getCollegeWithCompany
);

export default collegeRouter;
