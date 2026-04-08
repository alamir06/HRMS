import { leaveService } from "./LeaveService.js";

export const requestLeave = async (req, res) => {
  try {
    const result = await leaveService.requestLeave(req.body);
    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const approveLeave = async (req, res) => {
  try {
    const requestId = req.params.id;
    const approvedBy = req.user.employeeId; 
    const result = await leaveService.approveLeave(requestId, approvedBy, req.body);
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const rejectLeave = async (req, res) => {
  try {
    const requestId = req.params.id;
    const approvedBy = req.user.employeeId;
    const result = await leaveService.rejectLeave(requestId, approvedBy, req.body);
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

export const getEmployeeLeaveData = async (req, res) => {
  try {
    const { id } = req.params;
    // Basic authorization check: if user is an employee, they can only view their own
    const userRole = req.user?.role || req.user?.systemRole;
    if (userRole === 'EMPLOYEE' && req.user.employeeId !== id) {
      return res.status(403).json({ success: false, error: "Access denied. Employees can only view their own data." });
    }
    const { year } = req.query;
    const result = await leaveService.getEmployeeLeaveData(id, year);
    res.status(200).json({ success: true, message: "Employee leave data fetched", data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getMyLeaves = async (req, res) => {
  try {
    const id = req.user.employeeId;
    const { year } = req.query;
    const result = await leaveService.getEmployeeLeaveData(id, year);
    res.status(200).json({ success: true, message: "Your leave data fetched", data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const result = await leaveService.getAllRequests(req.query);
    res.status(200).json({
      success: true,
      message: "Leave requests fetched successfully",
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
