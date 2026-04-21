import express from 'express';
import { createCrudRouter } from '../Commons/CommonRouter.js';
import { collegeValidationSchema } from './CollegeValidation.js';
import { authenticateToken, authorize } from '../../middleware/auth.js';
import collegeCustomController from "./CollegeController.js"
import { ensureDefaultCompanyIdInBody } from "../Commons/defaultCompany.js";
import pool from "../../config/database.js";
import { translatePairs } from "../../utils/translationService.js";

const applyCollegeTranslations = async (req, res, next) => {
  try {
    if (req.body) {
      req.body = await translatePairs(req.body, [
        { enKey: "collegeName", amKey: "collegeNameAmharic" },
        { enKey: "collegeDescription", amKey: "collegeDescriptionAmharic" }
      ]);
    }
    next();
  } catch (error) {
    next(error);
  }
};

const collegeRouter = express.Router();

const validateCollegeDeletion = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [departments] = await pool.query('SELECT id FROM department WHERE collegeId = UUID_TO_BIN(?) LIMIT 1', [id]);
    if (departments.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Cannot delete this college because it is referenced by one or more departments.",
        details: [{ message: "Cannot delete this college because it is referenced by one or more departments." }]
      });
    }
    
    const [designations] = await pool.query('SELECT id FROM designations WHERE collegeId = UUID_TO_BIN(?) LIMIT 1', [id]);
    if (designations.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        message: "Cannot delete this college because it is referenced by one or more designations.",
        details: [{ message: "Cannot delete this college because it is referenced by one or more designations." }]
      });
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

const collegeCrudRouter = createCrudRouter({
  routePath: "/",
  tableName: "college",
  validationSchema: collegeValidationSchema,
  uuidEnabled: true,
  displayNameField: "collegeName",
  entityLabel: "college",
  uuidFields: ["id", "companyId"],
  createRoles: ["HRMANAGER"],
  readRoles: ["HRMANAGER","EMPLOYEE","DEAN"],
  updateRoles: ["HRMANAGER"],
  deleteRoles: ["HRMANAGER"],
  middleware: {
    create: [ensureDefaultCompanyIdInBody(), applyCollegeTranslations],
    read: [],
    update: [applyCollegeTranslations],
    delete: [validateCollegeDeletion],
    list: [],
    count: [],
  },
});


collegeRouter.use('/', collegeCrudRouter);


collegeRouter.get('/company/:companyId',
  authenticateToken,
  authorize('HRMANAGER'),
  collegeCustomController.getCollegesByCompany
);

// Statistics
collegeRouter.get('/stats/dashboard',
  authenticateToken,
  authorize('HRMANAGER'),
  collegeCustomController.getCollegeStats
);

// Bulk operations
collegeRouter.post('/bulk/create',
  authenticateToken,
  authorize('HRMANAGER'),
  collegeCustomController.bulkCreateColleges
);

// Search operations
collegeRouter.get('/search/global',
  authenticateToken,
  authorize('HRMANAGER'),
  collegeCustomController.searchColleges
);

// Validation
collegeRouter.get('/validate/name',
  authenticateToken,
  authorize('HRMANAGER'),
  collegeCustomController.validateCollegeName
);

// Get college with company details
collegeRouter.get('/:id/with-company',
  authenticateToken,
  authorize('HRMANAGER'),
  collegeCustomController.getCollegeWithCompany
);

export default collegeRouter;
