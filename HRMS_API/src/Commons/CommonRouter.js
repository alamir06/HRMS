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
    displayNameField = null, 
    entityLabel = "Record", 
    softDeleteEnabled = false,
    softDeleteField = "deleted_at",
    enableBulkOperations = false,
    authMiddleware = authenticateToken,
    createRoles,
    readRoles,
    updateRoles,
    deleteRoles,
    customRoutes = [],
    middleware = {
      create: [],
      read: [],
      update: [],
      delete: [],
      list: [],
      count: [],
    },
  } = config;

  const router = express.Router();

  const serviceConfig = {
    tableName,
    idField,
    uuidEnabled,
    uuidFields,
    softDeleteEnabled,
    softDeleteField,
  };

  const service = new CrudService(serviceConfig);
  const controller = new CrudController(
    service, 
    validationSchema,
    {
    displayNameField,
    entityLabel,
  }
  );

  // ID validation middleware
  const validateId = (req, res, next) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        error: "ID parameter is required",
      });
    }

    // Basic UUID validation if UUID enabled
    if (uuidEnabled) {
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          error: "Invalid ID format. Expected UUID.",
        });
      }
    }

    next();
  };

  const validateInclude = (req, res, next) => {
    const { include } = req.query;
    if (include) {
      const includeArray = include
        .split(",")
        .filter((item) => item.trim() !== "")
        .map((item) => item.trim());

      const validation = service.validateIncludes(includeArray);

      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: `Invalid include parameters: ${validation.invalidIncludes.join(
            ", "
          )}`,
          validIncludes: validation.validRelations,
          message: `Available relations for ${tableName}: ${validation.validRelations.join(
            ", "
          )}`,
        });
      }

      // Store validated includes for later use
      req.validatedIncludes = includeArray;
    }
    next();
  };

  // Apply authentication to all routes if specified
  if (authMiddleware) {
    router.use(authMiddleware);
  }

  // Apply role-based authorization
  const applyAuthorization = (roles) => {
    if (!roles) return []; // No authorization required
    return [authorize(...roles)];
  };


  // Standard CRUD routes
  router.post(
    "/",
    [
      ...applyAuthorization(createRoles),
      ...middleware.create,
    ],
    controller.create
  );

  // Bulk create route
  if (enableBulkOperations) {
    router.post(
      "/bulk",
      [
        ...applyAuthorization(createRoles),
        ...middleware.create,
      ],
      controller.bulkCreate
    );
  }

  router.get(
    "/",
    [
      validateInclude,
      ...applyAuthorization(readRoles),
      ...middleware.list,
    ],
    controller.findAll
  );

  router.get(
    "/count",
    [
      ...applyAuthorization(readRoles),
      ...middleware.count,
    ],
    controller.count
  );

  router.get(
    "/:id",
    [
      validateId,
      validateInclude,
      ...applyAuthorization(readRoles),
      ...middleware.read,
    ],
    controller.findById
  );

  router.get(
    "/:id/exists",
    [
      validateId,
      ...applyAuthorization(readRoles),
      ...middleware.read,
    ],
    controller.exists
  );

  router.put(
    "/:id",
    [
      validateId,
      ...applyAuthorization(updateRoles),
      ...middleware.update,
    ],
    controller.update
  );

  router.patch(
    "/:id",
    [
      validateId,
      ...applyAuthorization(updateRoles),
      ...middleware.update,
    ],
    controller.update
  );

  router.delete(
    "/:id",
    [
      validateId,
      // ...applyAuthorization(deleteRoles),
      ...middleware.delete,
    ],
    controller.delete
  );

  // Add custom routes
  customRoutes.forEach((route) => {
    const {
      method,
      path,
      handler,
      roles = [],
      middleware: routeMiddleware = [],
    } = route;

    const routeHandlers = [
      ...applyAuthorization(roles),
      ...routeMiddleware,
      handler,
    ].filter(Boolean);

    router[method.toLowerCase()](path, ...routeHandlers);
  });

  // Health check endpoint for the router
  router.get("/health/check", (req, res) => {
    res.json({
      success: true,
      message: `${tableName} router is healthy`,
      table: tableName,
      features: {
        uuidEnabled,
        softDeleteEnabled,
        bulkOperations: enableBulkOperations,
        validRelations: service.getValidRelations(),
      },
    });
  });

  return router;
};

// Utility function to create multiple CRUD routers
export const createCrudRouters = (configs) => {
  const routers = {};
  configs.forEach(config => {
    const { name, ...routerConfig } = config;
    routers[name] = createCrudRouter(routerConfig);
  });
  return routers;
};

// Default export for convenience
export default createCrudRouter;
