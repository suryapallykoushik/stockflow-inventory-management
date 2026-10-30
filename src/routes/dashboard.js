
const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Check whether the user is logged in
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in to access the dashboard."
    });
  }
  next();
}

// GET /api/dashboard
router.get("/", requireAuth, async (req, res) => {
  try {
    const organizationId = req.session.user.organizationId;

    // Get dashboard summary
    const [summaryRows] = await db.execute(
      `SELECT
        COUNT(p.id) AS totalProducts,
        COALESCE(SUM(p.quantity), 0) AS totalUnits,
        COALESCE(
          SUM(
            CASE
              WHEN p.quantity <= COALESCE(
                p.low_stock_threshold,
                s.default_low_stock_threshold,
                o.default_low_stock_threshold,
                10
              )
              THEN 1
              ELSE 0
            END
          ), 0
        ) AS lowStockCount
      FROM products p
      JOIN organizations o
        ON o.id = p.organization_id
      LEFT JOIN settings s
        ON s.organization_id = p.organization_id
      WHERE p.organization_id = ?`,
      [organizationId]
    );

    // Get products that need restocking
    const [lowStockProducts] = await db.execute(
      `SELECT
        p.id,
        p.name,
        p.sku,
        p.quantity,
        COALESCE(
          p.low_stock_threshold,
          s.default_low_stock_threshold,
          o.default_low_stock_threshold,
          10
        ) AS low_stock_threshold
      FROM products p
      JOIN organizations o
        ON o.id = p.organization_id
      LEFT JOIN settings s
        ON s.organization_id = p.organization_id
      WHERE p.organization_id = ?
        AND p.quantity <= COALESCE(
          p.low_stock_threshold,
          s.default_low_stock_threshold,
          o.default_low_stock_threshold,
          10
        )
      ORDER BY p.quantity ASC`,
      [organizationId]
    );

    res.json({
      summary: summaryRows[0],
      lowStockProducts
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      message: "Unable to load dashboard data."
    });
  }
});

module.exports = router;

