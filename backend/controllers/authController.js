const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");

const registerValidation = [
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  body("name").trim().isLength({ min: 2, max: 100 }),
];
const loginValidation = [body("email").isEmail().normalizeEmail(), body("password").notEmpty()];

function generateToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
}

async function register(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password, name } = req.body;
  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rows.length > 0) return res.status(409).json({ error: "Email already registered" });
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at",
      [email, passwordHash, name]
    );
    const user = result.rows[0];
    return res.status(201).json({ message: "Account created", token: generateToken(user.id), user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Registration failed" });
  }
}

async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT id, email, name, password_hash, storage_used, storage_limit FROM users WHERE email = $1 AND is_active = TRUE",
      [email]
    );
    if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    const { password_hash, ...safeUser } = user;
    return res.json({ message: "Login successful", token: generateToken(user.id), user: safeUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
}

async function getMe(req, res) {
  return res.json({ user: req.user });
}

module.exports = { register, login, getMe, registerValidation, loginValidation };