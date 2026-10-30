
require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");
const db = require("./src/config/db");

const app = express();

// Parse incoming request data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

// Serve frontend files
app.use(express.static(path.join(__dirname, "public")));

// Authentication routes
app.use("/api/auth", require("./src/routes/auth"));

app.use("/api/products", require("./src/routes/products"));

app.use("/api/dashboard", require("./src/routes/dashboard"));


// Database health check
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

// Home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`StockFlow running at http://localhost:${PORT}`);
});
