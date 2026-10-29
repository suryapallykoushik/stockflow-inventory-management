
const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../config/db");

const router = express.Router();

// Register a new user and organization
router.post("/register", async (req, res) => {
  const { organizationName, email, password } = req.body;

  if (
    !organizationName ||
    !email ||
    !password ||
    !organizationName.trim() ||
    !email.trim()
  ) {
    return res.status(400).json({
      message: "Organization name, email, and password are required."
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must contain at least 8 characters."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedOrgName = organizationName.trim();

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingUsers] = await connection.execute(
      "SELECT id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "An account with this email already exists."
      });
    }

    const [orgResult] = await connection.execute(
      `INSERT INTO organizations (name, default_low_stock_threshold)
       VALUES (?, 10)`,
      [normalizedOrgName]
    );

    const organizationId = orgResult.insertId;

    const passwordHash = await bcrypt.hash(password, 12);

    const [userResult] = await connection.execute(
      `INSERT INTO users (organization_id, email, password_hash)
       VALUES (?, ?, ?)`,
      [organizationId, normalizedEmail, passwordHash]
    );

    await connection.execute(
      `INSERT INTO settings (organization_id, default_low_stock_threshold)
       VALUES (?, 10)`,
      [organizationId]
    );

    await connection.commit();

    req.session.user = {
      id: userResult.insertId,
      organizationId,
      email: normalizedEmail,
      organizationName: normalizedOrgName
    };

    return res.status(201).json({
      message: "Registration successful.",
      user: req.session.user
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Registration failed. Please try again."
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Log in an existing user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required."
    });
  }

  try {
    const [users] = await db.execute(
      `SELECT
         users.id,
         users.organization_id,
         users.email,
         users.password_hash,
         organizations.name AS organization_name
       FROM users
       JOIN organizations
         ON organizations.id = users.organization_id
       WHERE users.email = ?
       LIMIT 1`,
      [email.trim().toLowerCase()]
    );

    if (
      users.length === 0 ||
      !(await bcrypt.compare(password, users[0].password_hash))
    ) {
      return res.status(401).json({
        message: "Invalid email or password."
      });
    }

    const user = users[0];

    req.session.user = {
      id: user.id,
      organizationId: user.organization_id,
      email: user.email,
      organizationName: user.organization_name
    };

    return res.json({
      message: "Login successful.",
      user: req.session.user
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Login failed. Please try again."
    });
  }
});

// Get the currently logged-in user
router.get("/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
      message: "You are not logged in."
    });
  }

  res.json({ user: req.session.user });
});

// Log out
router.post("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({
        message: "Could not log out."
      });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully." });
  });
});

module.exports = router;
