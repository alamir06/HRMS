import { leaveService } from "./LeaveService.js";
import { formatSuccessResponse, formatErrorResponse } from "../../utils/responseFormatter.js";

export const requestLeave = async (req, res) => {
  try {
    const result = await leaveService.requestLeave(req.body);
    res.status(201).json(formatSuccessResponse(result.message, result));
  } catch (error) {
    res.status(400).json(formatErrorResponse(error.message));
  }
};

export const approveLeave = async (req, res) => {
  try {
    const requestId = req.params.id;
    const approvedBy = req.user.employeeId; 
    const result = await leaveService.approveLeave(requestId, approvedBy, req.body);
    res.status(200).json(formatSuccessResponse(result.message, result));
  } catch (error) {
    res.status(400).json(formatErrorResponse(error.message));
  }
};

export const rejectLeave = async (req, res) => {
  try {
    const requestId = req.params.id;
    const approvedBy = req.user.employeeId;
    const result = await leaveService.rejectLeave(requestId, approvedBy, req.body);
    res.status(200).json(formatSuccessResponse(result.message, result));
  } catch (error) {
    res.status(400).json(formatErrorResponse(error.message));
  }
};

export const getEmployeeLeaveData = async (req, res) => {
  try {
    const { id } = req.params;
    const { year } = req.query;
    const result = await leaveService.getEmployeeLeaveData(id, year);
    res.status(200).json(formatSuccessResponse("Employee leave data fetched", result));
  } catch (error) {
    res.status(500).json(formatErrorResponse(error.message));
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const result = await leaveService.getAllRequests(req.query);
    res.status(200).json(
      formatSuccessResponse("Leave requests fetched successfully", result.data, result.pagination)
    );
  } catch (error) {
    res.status(500).json(formatErrorResponse(error.message));
  }
};
