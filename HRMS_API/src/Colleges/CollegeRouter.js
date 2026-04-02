import express from 'express';
import { createCrudRouter } from '../Commons/CommonRouter.js';
import { collegeValidationSchema } from './CollegeValidation.js';
import { authenticateToken, authorize } from '../../middleware/auth.js';
import collegeCustomController from "./CollegeController.js"
import { ensureDefaultCompanyIdInBody } from "../Commons/defaultCompany.js";

const collegeRouter = express.Router();
const collegeCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "college",
  validationSchema: collegeValidationSchema,
  uuidEnabled: true,
  displayNameField: "collegeName",
  entityLabel: "college",
  uuidFields: ["id", "companyId"],
  createRoles: ["HRMANAGER"],
  readRoles: null,
  updateRoles: ["HRMANAGER"],
  deleteRoles: ["HRMANAGER"],
  middleware: {
    create: [ensureDefaultCompanyIdInBody()],
    read: [],
    update: [],
    delete: [],
    list: [],
    count: [],
  },
});

collegeRouter.use('/', collegeCrudRouter);


collegeRouter.get('/company/:companyId',
  authenticateToken,
  authorize('admin', 'superAdmin', 'HRMANAGER', 'user'),
  collegeCustomController.getCollegesByCompany
);

// Statistics
collegeRouter.get('/stats/dashboard',
  authenticateToken,
  authorize('admin', 'superAdmin', 'HRMANAGER'),
  collegeCustomController.getCollegeStats
);

// Bulk operations
collegeRouter.post('/bulk/create',
  authenticateToken,
  authorize('admin', 'superAdmin'),
  collegeCustomController.bulkCreateColleges
);

// Search operations
collegeRouter.get('/search/global',
  authenticateToken,
  authorize('admin', 'superAdmin', 'HRMANAGER', 'user'),
  collegeCustomController.searchColleges
);

// Validation
collegeRouter.get('/validate/name',
  authenticateToken,
  authorize('admin', 'superAdmin', 'HRMANAGER'),
  collegeCustomController.validateCollegeName
);

// Get college with company details
collegeRouter.get('/:id/with-company',
  // authenticateToken,
  // authorize('admin', 'superAdmin', 'HRMANAGER', 'user'),
  collegeCustomController.getCollegeWithCompany
);

export default collegeRouter;
