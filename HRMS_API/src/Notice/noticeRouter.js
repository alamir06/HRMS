import { Router } from "express";
import {
  createNotice,
  listNotices,
  getNoticeById,
  updateNotice,
  publishNotice,
  deleteNotice,
} from "./noticeController.js";
import { noticeValidationSchema, validateNotice } from "./noticeValidation.js";

const router = Router();

router.post(
  "/",
  validateNotice(noticeValidationSchema.notice.create),
  createNotice
);

router.get(
  "/",
  validateNotice(noticeValidationSchema.notice.query, "query"),
  listNotices
);

router.get(
  "/:id",
  validateNotice(noticeValidationSchema.notice.id, "params"),
  getNoticeById
);

router.patch(
  "/:id",
  validateNotice(noticeValidationSchema.notice.id, "params"),
  validateNotice(noticeValidationSchema.notice.update),
  updateNotice
);

router.patch(
  "/:id/publish",
  validateNotice(noticeValidationSchema.notice.id, "params"),
  validateNotice(noticeValidationSchema.notice.publish),
  publishNotice
);

router.delete(
  "/:id",
  validateNotice(noticeValidationSchema.notice.id, "params"),
  deleteNotice
);

export default router;
