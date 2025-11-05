import express from 'express';

import companyController from './companyController.js';
import { companyIdSchema, createCompanySchema, updateCompanySchema, validateCompany } from './companyValidator.js';

const companyRouter = express.Router();

// Validation middleware for ID parameter
const validateCompanyId = (req, res, next) => {
  try {
    companyIdSchema.parse({ id: req.params.id });
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid company ID',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }
};

// Routes
companyRouter.post(
  '/createCompnay', 
  validateCompany(createCompanySchema),
  companyController.createCompany
);

companyRouter.get(
  '/getCompnay', 
  companyController.getAllCompanies
);

companyRouter.get(
  '/createCompnay/:id', 
  validateCompanyId,
  companyController.getCompanyById
);

companyRouter.put(
  '/createCompnay/:id', 
  validateCompanyId,
  validateCompany(updateCompanySchema),
  companyController.updateCompany
);

companyRouter.delete(
  '/createCompnay/:id', 
  validateCompanyId,
  companyController.deleteCompany
);

export default companyRouter;