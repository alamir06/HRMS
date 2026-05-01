import { recommendationService } from "./RecommendationService.js";

export const createRecommendation = async (req, res, next) => {
  try {
    const payload = {
      ...req.body,
      employeeId: req.user.employeeId
    };
    
    if (!payload.employeeId) {
      return res.status(403).json({ success: false, error: "Employee ID not found in user context." });
    }

    const result = await recommendationService.requestRecommendation(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const listRecommendations = async (req, res, next) => {
  try {
    const filters = { ...req.query };
    
    // If the user is an employee (not HR), force filter by their own employeeId
    if (req.user.role === 'EMPLOYEE' || req.user.role === 'ACADEMIC') {
      filters.employeeId = req.user.employeeId;
    }

    const result = await recommendationService.getAllRequests(filters);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getRecommendationById = async (req, res, next) => {
  try {
    const result = await recommendationService.getRequestById(req.params.id);
    
    // Security check
    if (req.user.role !== 'HRMANAGER' && result.employeeId !== req.user.employeeId) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }
    
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const updateRecommendationStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    
    // Only HR Manager can approve/reject
    if (req.user.role !== 'HRMANAGER') {
      return res.status(403).json({ success: false, error: "Only HR Manager can approve recommendations." });
    }

    const result = await recommendationService.updateStatus(
      req.params.id, 
      status, 
      req.user.id, 
      req.user.name, 
      { rejectionReason }
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
};
