import { createCrudRouter } from "../Commons/CommonRouter.js";
import { hrRoleValidationSchema } from "./HrRolesValidator.js";

const hrRoleRouter = createCrudRouter({
  routePath: "/hr-roles",
  tableName: "hr_roles",
  validationSchema: hrRoleValidationSchema,
  uuidEnabled: true,
  createRoles: ["admin", "super_admin", "hr_manager"],
  readRoles: ["admin", "super_admin", "hr_manager", "user"],
  updateRoles: ["admin", "super_admin", "hr_manager"],
  deleteRoles: ["super_admin"],
});

export default hrRoleRouter;
