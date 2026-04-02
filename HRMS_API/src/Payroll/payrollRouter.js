import { Router } from "express";
import {
  createPayrollRecord,
  listPayrollRecords,
  getPayrollById,
  getEmployeePayslips,
  updatePayrollRecord,
  markPayrollAsPaid,
  deletePayrollRecord,
  getPayrollSlip,
} from "./payrollController.js";
import { payrollValidationSchema, validatePayroll } from "./payrollValidation.js";

const router = Router();

router.post(
  "/",
  validatePayroll(payrollValidationSchema.payroll.create),
  createPayrollRecord
);

router.get(
  "/",
  validatePayroll(payrollValidationSchema.payroll.query, "query"),
  listPayrollRecords
);

router.get(
  "/employee/:employeeId",
  validatePayroll(payrollValidationSchema.payroll.employee, "params"),
  validatePayroll(payrollValidationSchema.payroll.query, "query"),
  getEmployeePayslips
);

router.get(
  "/:id/slip",
  validatePayroll(payrollValidationSchema.payroll.id, "params"),
  getPayrollSlip
);

router.get(
  "/:id",
  validatePayroll(payrollValidationSchema.payroll.id, "params"),
  getPayrollById
);

router.patch(
  "/:id",
  validatePayroll(payrollValidationSchema.payroll.id, "params"),
  validatePayroll(payrollValidationSchema.payroll.update),
  updatePayrollRecord
);

router.patch(
  "/:id/mark-paid",
  validatePayroll(payrollValidationSchema.payroll.id, "params"),
  validatePayroll(payrollValidationSchema.payroll.markPaid),
  markPayrollAsPaid
);

router.delete(
  "/:id",
  validatePayroll(payrollValidationSchema.payroll.id, "params"),
  deletePayrollRecord
);

export default router;
