import express from "express";
import { CrudController } from "./CommonController.js";
import { CrudService } from "./CommonServices.js";
import { authenticateToken, authorize } from "../../middleware/auth.js";


export const createCrudRouter = (config) => {
  const {
    routePath,
    tableName,
    validationSchema,
    idField = "id",
    uuidEnabled = true,
    uuidFields,
    // authMiddleware = authenticateToken,
    createRoles = ["admin", "super_admin"],
    readRoles = null, // null means all authenticated users
    updateRoles = ["admin", "super_admin"],
    deleteRoles = ["super_admin"],
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
