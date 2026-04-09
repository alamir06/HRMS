import express from "express";
import { 
  requestLeave, 
  approveLeave, 
  rejectLeave, 
  getEmployeeLeaveData, 
  getMyLeaves,
  getAllRequests 
} from "./leaveController.js";
import { leaveValidation } from "./leaveValidation.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import { fileUploadService } from "../../Commons/FileUploadService.js";

const router = express.Router();

const validateBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: "Validation error",
      details: error.errors
    });
  }
};

router.use(authenticateToken);

// Employee accessible routes
router.get("/mine", getMyLeaves);
router.get("/employee/:id", getEmployeeLeaveData);
router.post(
  "/request", 
  fileUploadService.uploadSingleDocument("supportDocument"),
  (req, res, next) => {
    if (req.file) {
      req.body.supportDocument = req.file.path;
    }
    next();
  },
  validateBody(leaveValidation.createLeave), 
  requestLeave
);

// Management accessible routes
router.use(authorize("HRMANAGER", "admin", "superAdmin")); 
router.get("/all", getAllRequests);
router.put("/:id/approve", validateBody(leaveValidation.approveLeave), approveLeave);
router.put("/:id/reject", validateBody(leaveValidation.rejectLeave), rejectLeave);

export default router;
