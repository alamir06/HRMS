import { Router } from "express";
import {
  createNotification,
  listNotifications,
  getNotificationById,
  getUserNotifications,
  updateNotification,
  markNotificationRead,
  markUserNotificationsRead,
  deleteNotification,
} from "./notificationController.js";
import {
  notificationValidationSchema,
  validateNotification,
} from "./notificationValidation.js";

const router = Router();

router.post(
  "/",
  validateNotification(notificationValidationSchema.notification.create),
  createNotification
);

router.get(
  "/",
  validateNotification(notificationValidationSchema.notification.query, "query"),
  listNotifications
);

router.get(
  "/user/:userId",
  validateNotification(notificationValidationSchema.notification.params, "params"),
  validateNotification(notificationValidationSchema.notification.query, "query"),
  getUserNotifications
);

router.patch(
  "/user/:userId/read",
  validateNotification(notificationValidationSchema.notification.params, "params"),
  validateNotification(notificationValidationSchema.notification.bulkRead),
  markUserNotificationsRead
);

router.get(
  "/:id",
  validateNotification(notificationValidationSchema.notification.id, "params"),
  getNotificationById
);

router.patch(
  "/:id",
  validateNotification(notificationValidationSchema.notification.id, "params"),
  validateNotification(notificationValidationSchema.notification.update),
  updateNotification
);

router.patch(
  "/:id/read",
  validateNotification(notificationValidationSchema.notification.id, "params"),
  validateNotification(notificationValidationSchema.notification.read),
  markNotificationRead
);

router.delete(
  "/:id",
  validateNotification(notificationValidationSchema.notification.id, "params"),
  deleteNotification
);

export default router;
