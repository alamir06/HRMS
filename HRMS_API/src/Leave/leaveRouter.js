import express from "express";
import { 
  requestLeave, 
  approveLeave, 
  rejectLeave, 
  getEmployeeLeaveData, 
  getAllRequests 
} from "./LeaveController.js";
import { validate } from "../../middleware/validationMiddleware.js";
import { leaveValidation } from "./LeaveValidation.js";
import { protect, restrictTo } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Employee accessible routes
router.get("/employee/:id", getEmployeeLeaveData);
router.post("/request", validate(leaveValidation.createLeave), requestLeave);

// Management accessible routes
router.use(restrictTo("HRMANAGER", "ADMIN")); 
router.get("/all", getAllRequests);
router.put("/:id/approve", validate(leaveValidation.approveLeave), approveLeave);
router.put("/:id/reject", validate(leaveValidation.rejectLeave), rejectLeave);

export default router;
