const rateLimit = require("express-rate-limit");

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 100, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: "Too many auth attempts" } });
const uploadLimiter = rateLimit({ windowMs: 60*60*1000, max: 50, standardHeaders: true, legacyHeaders: false });
const downloadLimiter = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false });

module.exports = { apiLimiter, authLimiter, uploadLimiter, downloadLimiter };