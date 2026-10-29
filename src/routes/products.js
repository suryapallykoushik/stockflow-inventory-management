
const express = require("express");
const db = require("../config/db");

const router = express.Router();

// Require login for all product routes
router.use((req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({
      message: "Please log in first."
    });
  }

  next();
});

// Get all products for the logged-in user's organization
router.get("/", async (req, res) => {
  try {
    const [products] = await db.execute(
      `SELECT id, name, sku, description, quantity,
              cost_price, selling_price, low_stock_threshold,
              created_at, updated_at
       FROM products
       WHERE organization_id = ?
       ORDER BY created_at DESC`,
      [req.session.user.organizationId]
    );

    res.json({ products });
  } catch (error) {
    console.error("Get products error:", error.message);
    res.status(500).json({ message: "Could not retrieve products." });
  }
});

// Add a product
router.post("/", async (req, res) => {
  const {
    name,
    sku,
    description,
    quantity,
    cost_price,
    selling_price,
    low_stock_threshold
  } = req.body;

  if (!name?.trim() || !sku?.trim()) {
    return res.status(400).json({
      message: "Product name and SKU are required."
    });
  }

  if (
    quantity === undefined ||
    quantity === null ||
    quantity === "" ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 0
  ) {
    return res.status(400).json({
      message: "Quantity must be a non-negative whole number."
    });
  }

  for (const [field, value] of [
    ["Cost price", cost_price],
    ["Selling price", selling_price],
    ["Low-stock threshold", low_stock_threshold]
  ]) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (!Number.isFinite(Number(value)) || Number(value) < 0)
    ) {
      return res.status(400).json({
        message: `${field} must be a non-negative number.`
      });
    }
  }

  if (
    low_stock_threshold !== undefined &&
    low_stock_threshold !== null &&
    low_stock_threshold !== "" &&
    !Number.isInteger(Number(low_stock_threshold))
  ) {
    return res.status(400).json({
      message: "Low-stock threshold must be a whole number."
    });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO products
       (organization_id, name, sku, description, quantity,
        cost_price, selling_price, low_stock_threshold)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.user.organizationId,
        name.trim(),
        sku.trim(),
        description?.trim() || null,
        Number(quantity),
        cost_price === "" || cost_price === undefined ? null : cost_price,
        selling_price === "" || selling_price === undefined ? null : selling_price,
        low_stock_threshold === "" || low_stock_threshold === undefined
          ? null
          : low_stock_threshold
      ]
    );

    res.status(201).json({
      message: "Product created successfully.",
      productId: result.insertId
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This SKU already exists in your organization."
      });
    }

    console.error("Create product error:", error.message);
    res.status(500).json({ message: "Could not create product." });
  }
});

// Update a product
router.put("/:id", async (req, res) => {
  const {
    name,
    sku,
    description,
    quantity,
    cost_price,
    selling_price,
    low_stock_threshold
  } = req.body;

  if (
    !name?.trim() ||
    !sku?.trim() ||
    quantity === undefined ||
    quantity === null ||
    quantity === "" ||
    !Number.isInteger(Number(quantity)) ||
    Number(quantity) < 0
  ) {
    return res.status(400).json({
      message: "Valid product name, SKU, and non-negative whole-number quantity are required."
    });
  }

  for (const [field, value] of [
    ["Cost price", cost_price],
    ["Selling price", selling_price],
    ["Low-stock threshold", low_stock_threshold]
  ]) {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      (!Number.isFinite(Number(value)) || Number(value) < 0)
    ) {
      return res.status(400).json({
        message: `${field} must be a non-negative number.`
      });
    }
  }

  if (
    low_stock_threshold !== undefined &&
    low_stock_threshold !== null &&
    low_stock_threshold !== "" &&
    !Number.isInteger(Number(low_stock_threshold))
  ) {
    return res.status(400).json({
      message: "Low-stock threshold must be a whole number."
    });
  }

  try {
    const [result] = await db.execute(
      `UPDATE products
       SET name = ?, sku = ?, description = ?, quantity = ?,
           cost_price = ?, selling_price = ?, low_stock_threshold = ?
       WHERE id = ? AND organization_id = ?`,
      [
        name.trim(),
        sku.trim(),
        description?.trim() || null,
        Number(quantity),
        cost_price === "" || cost_price === undefined ? null : cost_price,
        selling_price === "" || selling_price === undefined ? null : selling_price,
        low_stock_threshold === "" || low_stock_threshold === undefined
          ? null
          : low_stock_threshold,
        req.params.id,
        req.session.user.organizationId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    res.json({ message: "Product updated successfully." });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        message: "This SKU already exists in your organization."
      });
    }

    console.error("Update product error:", error.message);
    res.status(500).json({ message: "Could not update product." });
  }
});

// Delete a product
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.execute(
      "DELETE FROM products WHERE id = ? AND organization_id = ?",
      [req.params.id, req.session.user.organizationId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        message: "Product not found."
      });
    }

    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    console.error("Delete product error:", error.message);
    res.status(500).json({ message: "Could not delete product." });
  }
});

module.exports = router;
