
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Check login
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }
  next();
}

// GET /api/settings
// Retrieve organization settings
router.get("/", requireAuth, async (req, res) => {
  try {
    const organizationId = req.session.user.organizationId;

    const [rows] = await db.execute(
      `SELECT default_low_stock_threshold
       FROM settings
       WHERE organization_id = ?`,
      [organizationId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Settings not found."
      });
    }

    res.json({
      defaultLowStockThreshold: rows[0].default_low_stock_threshold
    });

  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      message: "Unable to retrieve settings."
    });
  }
});

// PUT /api/settings
// Update organization settings
router.put("/", requireAuth, async (req, res) => {
  try {
    const organizationId = req.session.user.organizationId;
    const { defaultLowStockThreshold } = req.body;

    if (
      defaultLowStockThreshold === undefined ||
      !Number.isInteger(Number(defaultLowStockThreshold)) ||
      Number(defaultLowStockThreshold) < 0
    ) {
      return res.status(400).json({
        message: "Please provide a valid non-negative threshold."
      });
    }

    const threshold = Number(defaultLowStockThreshold);

    const [result] = await db.execute(
      `UPDATE settings
       SET default_low_stock_threshold = ?
       WHERE organization_id = ?`,
      [threshold, organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Settings not found."
      });
    }

    // Keep organization default in sync
    await db.execute(
      `UPDATE organizations
       SET default_low_stock_threshold = ?
       WHERE id = ?`,
      [threshold, organizationId]
    );

    res.json({
      message: "Settings updated successfully.",
      defaultLowStockThreshold: threshold
    });

  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({
      message: "Unable to update settings."
    });
  }
});

module.exports = router;
