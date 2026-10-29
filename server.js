
require("dotenv").config();

const express = require("express");
const path = require("path");
const db = require("./src/config/db");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS ok");

    res.json({
      status: "ok",
      database: rows[0].ok === 1
    });
  } catch (error) {
    console.error("Database connection error:", error.message);
    res.status(500).json({
      status: "error",
      message: "Database connection failed"
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`StockFlow running at http://localhost:${PORT}`);
});
