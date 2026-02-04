import { v4 as uuidv4 } from "uuid";
import pool from "../../config/database.js";

const DEFAULT_LIMIT = 50;

const toNumber = (value) => (value === null || typeof value === "undefined" ? null : Number(value));
const toAmount = (value, fallback = 0) => {
  const resolved = value ?? fallback ?? 0;
  const numeric = Number(resolved);
  return Number.isFinite(numeric) ? numeric : 0;
};
const parseLimit = (value, fallback = DEFAULT_LIMIT) => {
  if (value === null || typeof value === "undefined") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const parseOffset = (value) => {
  if (value === null || typeof value === "undefined") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const parseBoolean = (value) => {
  if (value === null || typeof value === "undefined") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no"].includes(normalized)) return false;
  }
  return undefined;
};

const calculateTotals = (data) => {
  const earnings = [
    toAmount(data.basic_salary),
    toAmount(data.house_rent_allowance),
    toAmount(data.travel_allowance),
    toAmount(data.medical_allowance),
    toAmount(data.overtime_allowance),
    toAmount(data.other_allowances),
  ];

  const deductions = [
    toAmount(data.tax_deduction),
    toAmount(data.provident_fund),
    toAmount(data.leave_deduction),
    toAmount(data.other_deductions),
  ];

  const totalEarnings = earnings.reduce((sum, value) => sum + value, 0);
  const totalDeductions = deductions.reduce((sum, value) => sum + value, 0);
  const netSalary = Number((totalEarnings - totalDeductions).toFixed(2));

  return {
    totalEarnings: Number(totalEarnings.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    netSalary,
  };
};

const mapPayrollRecord = (record) => ({
  id: record.id,
  employeeId: record.employee_id,
  employeeCode: record.employee_code,
  employeeName: record.employee_name,
  payPeriodStart: record.pay_period_start,
  payPeriodEnd: record.pay_period_end,
  basicSalary: toNumber(record.basic_salary),
  houseRentAllowance: toNumber(record.house_rent_allowance),
  travelAllowance: toNumber(record.travel_allowance),
  medicalAllowance: toNumber(record.medical_allowance),
  overtimeAllowance: toNumber(record.overtime_allowance),
  otherAllowances: toNumber(record.other_allowances),
  totalEarnings: toNumber(record.total_earnings),
  taxDeduction: toNumber(record.tax_deduction),
  providentFund: toNumber(record.provident_fund),
  leaveDeduction: toNumber(record.leave_deduction),
  otherDeductions: toNumber(record.other_deductions),
  totalDeductions: toNumber(record.total_deductions),
  netSalary: toNumber(record.net_salary),
  paymentDate: record.payment_date,
  paymentStatus: record.payment_status,
  generatedBy: record.generated_by,
  generatedByUsername: record.generated_by_username,
  departmentId: record.department_id,
  departmentName: record.department_name,
  designationId: record.designation_id,
  designationTitle: record.designation_title,
  createdAt: record.created_at,
  updatedAt: record.updated_at,
});

const buildBaseSelect = (whereClause = "") => `
  SELECT
    BIN_TO_UUID(p.id) AS id,
    BIN_TO_UUID(p.employee_id) AS employee_id,
    p.pay_period_start,
    p.pay_period_end,
    p.basic_salary,
    p.house_rent_allowance,
    p.travel_allowance,
    p.medical_allowance,
    p.overtime_allowance,
    p.other_allowances,
    p.total_earnings,
    p.tax_deduction,
    p.provident_fund,
    p.leave_deduction,
    p.other_deductions,
    p.total_deductions,
    p.net_salary,
    p.payment_date,
    p.payment_status,
    BIN_TO_UUID(p.generated_by) AS generated_by,
    p.created_at,
    p.updated_at,
    e.employee_code,
    e.employment_type,
    e.employment_status,
    BIN_TO_UUID(e.department_id) AS department_id,
    BIN_TO_UUID(e.designation_id) AS designation_id,
    d.department_name,
    ds.title AS designation_title,
    CONCAT_WS(' ', ep.first_name, ep.middle_name, ep.last_name) AS employee_name,
    u.username AS generated_by_username
  FROM payroll p
  LEFT JOIN employee e ON p.employee_id = e.id
  LEFT JOIN employee_personal ep ON e.id = ep.employee_id
  LEFT JOIN department d ON e.department_id = d.id
  LEFT JOIN designations ds ON e.designation_id = ds.id
  LEFT JOIN users u ON p.generated_by = u.id
  ${whereClause}
`;

const buildFilters = ({
  employeeId,
  paymentStatus,
  startDate,
  endDate,
  includePending,
}) => {
  const conditions = [];
  const params = [];

  if (employeeId) {
    conditions.push("p.employee_id = UUID_TO_BIN(?)");
    params.push(employeeId);
  }

  if (paymentStatus) {
    conditions.push("p.payment_status = ?");
    params.push(paymentStatus);
  }

  if (startDate) {
    conditions.push("p.pay_period_start >= ?");
    params.push(startDate);
  }

  if (endDate) {
    conditions.push("p.pay_period_end <= ?");
    params.push(endDate);
  }

  if (includePending === false && !paymentStatus) {
    conditions.push("p.payment_status = 'Paid'");
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  return { whereClause, params };
};

const fetchPayrollRecord = async (id) => {
  const query = `${buildBaseSelect("WHERE p.id = UUID_TO_BIN(?)" )} LIMIT 1`;
  const [rows] = await pool.query(query, [id]);
  return rows.length ? rows[0] : null;
};

export const createPayrollRecord = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const id = uuidv4();
    const data = req.body;

    const totals = calculateTotals(data);

    const insertQuery = `
      INSERT INTO payroll (
        id,
        employee_id,
        pay_period_start,
        pay_period_end,
        basic_salary,
        house_rent_allowance,
        travel_allowance,
        medical_allowance,
        overtime_allowance,
        other_allowances,
        total_earnings,
        tax_deduction,
        provident_fund,
        leave_deduction,
        other_deductions,
        total_deductions,
        net_salary,
        payment_date,
        payment_status,
        generated_by
      ) VALUES (
        UUID_TO_BIN(?),
        UUID_TO_BIN(?),
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        UUID_TO_BIN(?)
      )
    `;

    const values = [
      id,
      data.employee_id,
      data.pay_period_start,
      data.pay_period_end,
      toAmount(data.basic_salary),
      toAmount(data.house_rent_allowance),
      toAmount(data.travel_allowance),
      toAmount(data.medical_allowance),
      toAmount(data.overtime_allowance),
      toAmount(data.other_allowances),
      totals.totalEarnings,
      toAmount(data.tax_deduction),
      toAmount(data.provident_fund),
      toAmount(data.leave_deduction),
      toAmount(data.other_deductions),
      totals.totalDeductions,
      totals.netSalary,
      data.payment_date || null,
      data.payment_status || "Pending",
      data.generated_by,
    ];

    await connection.beginTransaction();
    await connection.execute(insertQuery, values);
    await connection.commit();

    res.status(201).json({
      success: true,
      data: { id },
      message: "Payroll record created successfully",
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const listPayrollRecords = async (req, res, next) => {
  try {
    const {
      employee_id,
      payment_status,
      start_date,
      end_date,
      include_pending,
      limit,
      offset,
    } = req.query;

    const { whereClause, params } = buildFilters({
      employeeId: employee_id,
      paymentStatus: payment_status,
      startDate: start_date,
      endDate: end_date,
      includePending: parseBoolean(include_pending),
    });

    const limitValue = parseLimit(limit);
    const offsetValue = parseOffset(offset);

    const query = `${buildBaseSelect(whereClause)} ORDER BY p.pay_period_end DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(query, [...params, limitValue, offsetValue]);

    res.json({
      success: true,
      data: rows.map(mapPayrollRecord),
    });
  } catch (error) {
    next(error);
  }
};

export const getPayrollById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const record = await fetchPayrollRecord(id);

    if (!record) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    res.json({ success: true, data: mapPayrollRecord(record) });
  } catch (error) {
    next(error);
  }
};

export const getEmployeePayslips = async (req, res, next) => {
  const { employeeId } = req.params;
  try {
    const {
      payment_status,
      start_date,
      end_date,
      include_pending,
      limit,
      offset,
    } = req.query;

    const { whereClause, params } = buildFilters({
      employeeId,
      paymentStatus: payment_status,
      startDate: start_date,
      endDate: end_date,
      includePending: parseBoolean(include_pending),
    });

    const limitValue = parseLimit(limit);
    const offsetValue = parseOffset(offset);

    const query = `${buildBaseSelect(whereClause)} ORDER BY p.pay_period_end DESC LIMIT ? OFFSET ?`;
    const [rows] = await pool.query(query, [...params, limitValue, offsetValue]);

    res.json({
      success: true,
      data: rows.map(mapPayrollRecord),
    });
  } catch (error) {
    next(error);
  }
};

export const updatePayrollRecord = async (req, res, next) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const existing = await fetchPayrollRecord(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    const merged = {
      employee_id: updates.employee_id ?? existing.employee_id,
      pay_period_start: updates.pay_period_start ?? existing.pay_period_start,
      pay_period_end: updates.pay_period_end ?? existing.pay_period_end,
      payment_date: Object.prototype.hasOwnProperty.call(updates, "payment_date")
        ? updates.payment_date
        : existing.payment_date,
      payment_status: updates.payment_status ?? existing.payment_status,
      generated_by: updates.generated_by ?? existing.generated_by,
      basic_salary: toAmount(updates.basic_salary, existing.basic_salary),
      house_rent_allowance: toAmount(updates.house_rent_allowance, existing.house_rent_allowance),
      travel_allowance: toAmount(updates.travel_allowance, existing.travel_allowance),
      medical_allowance: toAmount(updates.medical_allowance, existing.medical_allowance),
      overtime_allowance: toAmount(updates.overtime_allowance, existing.overtime_allowance),
      other_allowances: toAmount(updates.other_allowances, existing.other_allowances),
      tax_deduction: toAmount(updates.tax_deduction, existing.tax_deduction),
      provident_fund: toAmount(updates.provident_fund, existing.provident_fund),
      leave_deduction: toAmount(updates.leave_deduction, existing.leave_deduction),
      other_deductions: toAmount(updates.other_deductions, existing.other_deductions),
    };

    const totals = calculateTotals(merged);

    const updateQuery = `
      UPDATE payroll SET
        employee_id = UUID_TO_BIN(?),
        pay_period_start = ?,
        pay_period_end = ?,
        basic_salary = ?,
        house_rent_allowance = ?,
        travel_allowance = ?,
        medical_allowance = ?,
        overtime_allowance = ?,
        other_allowances = ?,
        total_earnings = ?,
        tax_deduction = ?,
        provident_fund = ?,
        leave_deduction = ?,
        other_deductions = ?,
        total_deductions = ?,
        net_salary = ?,
        payment_date = ?,
        payment_status = ?,
        generated_by = UUID_TO_BIN(?),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = UUID_TO_BIN(?)
    `;

    const values = [
      merged.employee_id,
      merged.pay_period_start,
      merged.pay_period_end,
      merged.basic_salary,
      merged.house_rent_allowance,
      merged.travel_allowance,
      merged.medical_allowance,
      merged.overtime_allowance,
      merged.other_allowances,
      totals.totalEarnings,
      merged.tax_deduction,
      merged.provident_fund,
      merged.leave_deduction,
      merged.other_deductions,
      totals.totalDeductions,
      totals.netSalary,
      merged.payment_date || null,
      merged.payment_status,
      merged.generated_by,
      id,
    ];

    const [result] = await pool.execute(updateQuery, values);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    res.json({ success: true, message: "Payroll record updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const markPayrollAsPaid = async (req, res, next) => {
  const { id } = req.params;
  const { payment_date, payment_status } = req.body;

  const effectiveStatus = payment_status || "Paid";
  const effectiveDate = payment_date || new Date().toISOString().slice(0, 10);

  try {
    const [result] = await pool.execute(
      `UPDATE payroll
         SET payment_status = ?,
             payment_date = ?,
             updated_at = CURRENT_TIMESTAMP
       WHERE id = UUID_TO_BIN(?)`,
      [effectiveStatus, effectiveDate, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    res.json({ success: true, message: "Payroll marked as paid" });
  } catch (error) {
    next(error);
  }
};

export const deletePayrollRecord = async (req, res, next) => {
  const { id } = req.params;

  try {
    const [result] = await pool.execute("DELETE FROM payroll WHERE id = UUID_TO_BIN(?)", [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    res.json({ success: true, message: "Payroll record deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const getPayrollSlip = async (req, res, next) => {
  const { id } = req.params;
  try {
    const query = `${buildBaseSelect("WHERE p.id = UUID_TO_BIN(?)")} LIMIT 1`;
    const [rows] = await pool.query(query, [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Payroll record not found" });
    }

    const record = rows[0];
    const slip = {
      payroll: mapPayrollRecord(record),
      employee: {
        id: record.employee_id,
        code: record.employee_code,
        name: record.employee_name,
        employmentType: record.employment_type,
        employmentStatus: record.employment_status,
        departmentId: record.department_id,
        departmentName: record.department_name,
        designationId: record.designation_id,
        designationTitle: record.designation_title,
      },
      earnings: {
        basicSalary: toNumber(record.basic_salary),
        houseRentAllowance: toNumber(record.house_rent_allowance),
        travelAllowance: toNumber(record.travel_allowance),
        medicalAllowance: toNumber(record.medical_allowance),
        overtimeAllowance: toNumber(record.overtime_allowance),
        otherAllowances: toNumber(record.other_allowances),
        total: toNumber(record.total_earnings),
      },
      deductions: {
        taxDeduction: toNumber(record.tax_deduction),
        providentFund: toNumber(record.provident_fund),
        leaveDeduction: toNumber(record.leave_deduction),
        otherDeductions: toNumber(record.other_deductions),
        total: toNumber(record.total_deductions),
      },
      summary: {
        netSalary: toNumber(record.net_salary),
        payPeriod: {
          start: record.pay_period_start,
          end: record.pay_period_end,
        },
        payment: {
          status: record.payment_status,
          date: record.payment_date,
        },
        generatedBy: {
          id: record.generated_by,
          username: record.generated_by_username,
        },
      },
    };

    res.json({ success: true, data: slip });
  } catch (error) {
    next(error);
  }
};
