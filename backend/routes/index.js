const express = require("express");
const router = express.Router();
const auth = require("../controllers/authController");
const files = require("../controllers/fileController");
const share = require("../controllers/shareController");
const analytics = require("../controllers/analyticsController");
const { authenticate } = require("../middlewares/auth");
const { upload, handleMulterError } = require("../middlewares/upload");
const { authLimiter, uploadLimiter, downloadLimiter } = require("../middlewares/rateLimiter");

router.post("/auth/register", authLimiter, auth.registerValidation, auth.register);
router.post("/auth/login",    authLimiter, auth.loginValidation,    auth.login);
router.get("/auth/me",        authenticate, auth.getMe);

router.post("/files/upload", authenticate, uploadLimiter, upload.single("file"), handleMulterError, files.uploadFile);
router.get("/files",         authenticate, files.listFiles);
router.delete("/files/:id",  authenticate, files.deleteFile);

router.post("/share/create",         authenticate, share.createShareValidation, share.createShareLink);
router.get("/share",                  authenticate, share.listShareLinks);
router.delete("/share/:id",           authenticate, share.deleteShareLink);
router.get("/share/:token/info",      downloadLimiter, share.getShareInfo);
router.post("/share/:token/download", downloadLimiter, share.downloadFile);

router.get("/analytics", authenticate, analytics.getAnalytics);

module.exports = router;