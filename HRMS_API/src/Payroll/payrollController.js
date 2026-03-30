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
    toAmount(data.basicSalary),
    toAmount(data.houseRentAllowance),
    toAmount(data.travelAllowance),
    toAmount(data.medicalAllowance),
    toAmount(data.overtimeAllowance),
    toAmount(data.otherAllowances),
  ];

  const deductions = [
    toAmount(data.taxDeduction),
    toAmount(data.providentFund),
    toAmount(data.leaveDeduction),
    toAmount(data.otherDeductions),
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
  employeeId: record.employeeId,
  employeeCode: record.employeeCode,
  employeeName: record.employeeName,
  payPeriodStart: record.payPeriodStart,
  payPeriodEnd: record.payPeriodEnd,
  basicSalary: toNumber(record.basicSalary),
  houseRentAllowance: toNumber(record.houseRentAllowance),
  travelAllowance: toNumber(record.travelAllowance),
  medicalAllowance: toNumber(record.medicalAllowance),
  overtimeAllowance: toNumber(record.overtimeAllowance),
  otherAllowances: toNumber(record.otherAllowances),
  totalEarnings: toNumber(record.totalEarnings),
  taxDeduction: toNumber(record.taxDeduction),
  providentFund: toNumber(record.providentFund),
  leaveDeduction: toNumber(record.leaveDeduction),
  otherDeductions: toNumber(record.otherDeductions),
  totalDeductions: toNumber(record.totalDeductions),
  netSalary: toNumber(record.netSalary),
  paymentDate: record.paymentDate,
  paymentStatus: record.paymentStatus,
  generatedBy: record.generatedBy,
  generatedByUsername: record.generatedByUsername,
  departmentId: record.departmentId,
  departmentName: record.departmentName,
  designationId: record.designationId,
  designationTitle: record.designationTitle,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const buildBaseSelect = (whereClause = "") => `
  SELECT
    BIN_TO_UUID(p.id) AS id,
    BIN_TO_UUID(p.employeeId) AS employeeId,
    p.payPeriodStart,
    p.payPeriodEnd,
    p.basicSalary,
    p.houseRentAllowance,
    p.travelAllowance,
    p.medicalAllowance,
    p.overtimeAllowance,
    p.otherAllowances,
    p.totalEarnings,
    p.taxDeduction,
    p.providentFund,
    p.leaveDeduction,
    p.otherDeductions,
    p.totalDeductions,
    p.netSalary,
    p.paymentDate,
    p.paymentStatus,
    BIN_TO_UUID(p.generatedBy) AS generatedBy,
    p.createdAt,
    p.updatedAt,
    e.employeeCode,
    e.employmentType,
    e.employmentStatus,
    BIN_TO_UUID(e.departmentId) AS departmentId,
    BIN_TO_UUID(ds.employeeId) AS designationId,
    d.departmentName,
    ds.title AS designationTitle,
    CONCAT_WS(' ', ep.firstName, ep.middleName, ep.lastName) AS employeeName,
    u.username AS generatedByUsername
  FROM payroll p
  LEFT JOIN employee e ON p.employeeId = e.id
  LEFT JOIN employeePersonal ep ON e.id = ep.employeeId
  LEFT JOIN department d ON e.departmentId = d.id
  LEFT JOIN designations ds ON ds.employeeId = e.id
  LEFT JOIN users u ON p.generatedBy = u.id
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
    conditions.push("p.employeeId = UUID_TO_BIN(?)");
    params.push(employeeId);
  }

  if (paymentStatus) {
    conditions.push("p.paymentStatus = ?");
    params.push(paymentStatus);
  }

  if (startDate) {
    conditions.push("p.payPeriodStart >= ?");
    params.push(startDate);
  }

  if (endDate) {
    conditions.push("p.payPeriodEnd <= ?");
    params.push(endDate);
  }

  if (includePending === false && !paymentStatus) {
    conditions.push("p.paymentStatus = 'Paid'");
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
        employeeId,
        payPeriodStart,
        payPeriodEnd,
        basicSalary,
        houseRentAllowance,
        travelAllowance,
        medicalAllowance,
        overtimeAllowance,
        otherAllowances,
        totalEarnings,
        taxDeduction,
        providentFund,
        leaveDeduction,
        otherDeductions,
        totalDeductions,
        netSalary,
        paymentDate,
        paymentStatus,
        generatedBy
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
      data.employeeId,
      data.payPeriodStart,
      data.payPeriodEnd,
      toAmount(data.basicSalary),
      toAmount(data.houseRentAllowance),
      toAmount(data.travelAllowance),
      toAmount(data.medicalAllowance),
      toAmount(data.overtimeAllowance),
      toAmount(data.otherAllowances),
      totals.totalEarnings,
      toAmount(data.taxDeduction),
      toAmount(data.providentFund),
      toAmount(data.leaveDeduction),
      toAmount(data.otherDeductions),
      totals.totalDeductions,
      totals.netSalary,
      data.paymentDate || null,
      data.paymentStatus || "Pending",
      data.generatedBy,
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
      employeeId,
      paymentStatus,
      startDate,
      endDate,
      includePending,
      limit,
      offset,
    } = req.query;

    const { whereClause, params } = buildFilters({
      employeeId: employeeId,
      paymentStatus: paymentStatus,
      startDate: startDate,
      endDate: endDate,
      includePending: parseBoolean(includePending),
    });

    const limitValue = parseLimit(limit);
    const offsetValue = parseOffset(offset);

    const query = `${buildBaseSelect(whereClause)} ORDER BY p.payPeriodEnd DESC LIMIT ? OFFSET ?`;
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
      paymentStatus,
      startDate,
      endDate,
      includePending,
      limit,
      offset,
    } = req.query;

    const { whereClause, params } = buildFilters({
      employeeId,
      paymentStatus: paymentStatus,
      startDate: startDate,
      endDate: endDate,
      includePending: parseBoolean(includePending),
    });

    const limitValue = parseLimit(limit);
    const offsetValue = parseOffset(offset);

    const query = `${buildBaseSelect(whereClause)} ORDER BY p.payPeriodEnd DESC LIMIT ? OFFSET ?`;
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
      employeeId: updates.employeeId ?? existing.employeeId,
      payPeriodStart: updates.payPeriodStart ?? existing.payPeriodStart,
      payPeriodEnd: updates.payPeriodEnd ?? existing.payPeriodEnd,
      paymentDate: Object.prototype.hasOwnProperty.call(updates, "paymentDate")
        ? updates.paymentDate
        : existing.paymentDate,
      paymentStatus: updates.paymentStatus ?? existing.paymentStatus,
      generatedBy: updates.generatedBy ?? existing.generatedBy,
      basicSalary: toAmount(updates.basicSalary, existing.basicSalary),
      houseRentAllowance: toAmount(updates.houseRentAllowance, existing.houseRentAllowance),
      travelAllowance: toAmount(updates.travelAllowance, existing.travelAllowance),
      medicalAllowance: toAmount(updates.medicalAllowance, existing.medicalAllowance),
      overtimeAllowance: toAmount(updates.overtimeAllowance, existing.overtimeAllowance),
      otherAllowances: toAmount(updates.otherAllowances, existing.otherAllowances),
      taxDeduction: toAmount(updates.taxDeduction, existing.taxDeduction),
      providentFund: toAmount(updates.providentFund, existing.providentFund),
      leaveDeduction: toAmount(updates.leaveDeduction, existing.leaveDeduction),
      otherDeductions: toAmount(updates.otherDeductions, existing.otherDeductions),
    };

    const totals = calculateTotals(merged);

    const updateQuery = `
      UPDATE payroll SET
        employeeId = UUID_TO_BIN(?),
        payPeriodStart = ?,
        payPeriodEnd = ?,
        basicSalary = ?,
        houseRentAllowance = ?,
        travelAllowance = ?,
        medicalAllowance = ?,
        overtimeAllowance = ?,
        otherAllowances = ?,
        totalEarnings = ?,
        taxDeduction = ?,
        providentFund = ?,
        leaveDeduction = ?,
        otherDeductions = ?,
        totalDeductions = ?,
        netSalary = ?,
        paymentDate = ?,
        paymentStatus = ?,
        generatedBy = UUID_TO_BIN(?),
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = UUID_TO_BIN(?)
    `;

    const values = [
      merged.employeeId,
      merged.payPeriodStart,
      merged.payPeriodEnd,
      merged.basicSalary,
      merged.houseRentAllowance,
      merged.travelAllowance,
      merged.medicalAllowance,
      merged.overtimeAllowance,
      merged.otherAllowances,
      totals.totalEarnings,
      merged.taxDeduction,
      merged.providentFund,
      merged.leaveDeduction,
      merged.otherDeductions,
      totals.totalDeductions,
      totals.netSalary,
      merged.paymentDate || null,
      merged.paymentStatus,
      merged.generatedBy,
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
  const { paymentDate, paymentStatus } = req.body;

  const effectiveStatus = paymentStatus || "Paid";
  const effectiveDate = paymentDate || new Date().toISOString().slice(0, 10);

  try {
    const [result] = await pool.execute(
      `UPDATE payroll
         SET paymentStatus = ?,
             paymentDate = ?,
             updatedAt = CURRENT_TIMESTAMP
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
        id: record.employeeId,
        code: record.employeeCode,
        name: record.employeeName,
        employmentType: record.employmentType,
        employmentStatus: record.employmentStatus,
        departmentId: record.departmentId,
        departmentName: record.departmentName,
        designationId: record.designationId,
        designationTitle: record.designationTitle,
      },
      earnings: {
        basicSalary: toNumber(record.basicSalary),
        houseRentAllowance: toNumber(record.houseRentAllowance),
        travelAllowance: toNumber(record.travelAllowance),
        medicalAllowance: toNumber(record.medicalAllowance),
        overtimeAllowance: toNumber(record.overtimeAllowance),
        otherAllowances: toNumber(record.otherAllowances),
        total: toNumber(record.totalEarnings),
      },
      deductions: {
        taxDeduction: toNumber(record.taxDeduction),
        providentFund: toNumber(record.providentFund),
        leaveDeduction: toNumber(record.leaveDeduction),
        otherDeductions: toNumber(record.otherDeductions),
        total: toNumber(record.totalDeductions),
      },
      summary: {
        netSalary: toNumber(record.netSalary),
        payPeriod: {
          start: record.payPeriodStart,
          end: record.payPeriodEnd,
        },
        payment: {
          status: record.paymentStatus,
          date: record.paymentDate,
        },
        generatedBy: {
          id: record.generatedBy,
          username: record.generatedByUsername,
        },
      },
    };

    res.json({ success: true, data: slip });
  } catch (error) {
    next(error);
  }
};
