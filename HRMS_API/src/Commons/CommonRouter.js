import express from "express";
import { CrudController } from "./CommonController.js";
import { CrudService } from "./CommonServices.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";
import { tableSchemaService } from "../../Commons/TableSchemaService.js";


export const createCrudRouter = (config) => {
  const {
    routePath,
    tableName,
    validationSchema,
    idField = "id",
    uuidEnabled = true,
    uuidFields,
    // authMiddleware = authenticateToken,
    createRoles = ["HR_MANAGER", "DEAN", "employee", "HEAD", "FINANCE_OFFICER"],
    readRoles = null, // null means all authenticated users
    updateRoles = ["HR_MANAGER", "DEAN", "employee", "HEAD", "FINANCE_OFFICER"],
    deleteRoles = ["HR_MANAGER"],
    customRoutes = [],
  } = config;

  const router = express.Router();
  const service = new CrudService(tableName, idField, uuidEnabled,uuidFields);
  const controller = new CrudController(service, validationSchema);

  // ID validation middleware
  const validateId = (req, res, next) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID parameter is required",
      });
    }
    next();
  };

  // Apply authentication to all routes if specified
  // if (authMiddleware) {
  //   router.use(authMiddleware);
  // }

  // Apply role-based authorization
  // const applyAuthorization = (roles) => {
  //   if (!roles) return []; // No authorization required
  //   return [authorize(...roles)];
  // };
const validateInclude = (req, res, next) => {
  const { include } = req.query;
  if (include) {
    const includeArray = include
      .split(",")
      .filter((item) => item.trim() !== "");
    const validation = service.validateIncludes(includeArray);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid include parameters: ${validation.invalidIncludes.join(
          ", "
        )}`,
        validIncludes: validation.validRelations,
      });
    }
  }
  next();
};

  // Standard CRUD routes
  router.post("/", [
    // ...applyAuthorization(createRoles)
  ], 
    controller.create);

  router.get("/", [
    // ...applyAuthorization(readRoles)
  ], 
    controller.findAll);

  router.get(
    "/:id",
    validateId,
    // [...applyAuthorization(readRoles)],
    controller.findById
  );

  router.put(
    "/:id",
    validateId,
    // [...applyAuthorization(updateRoles)],
    controller.update
  );

  router.delete(
    "/:id",
    validateId,
    // [...applyAuthorization(deleteRoles)],
    controller.delete
  );

  // Add custom routes
  customRoutes.forEach((route) => {
    const { method, path, handler, roles = [] } = route;
    router[method.toLowerCase()](path, 
      // [...applyAuthorization(roles)],
       handler);
  });

  return router;
};
