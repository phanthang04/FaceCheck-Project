import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import {connectDB} from "./src/config/connectDB.js";
import route from "./src/routes/web.js";

const app = express();
const port = 3000;

// Dùng __dirname trong ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// cấu hình view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "./src/views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


import session from "express-session";

app.use(session({
    secret: process.env.SESSION_SECRET || "pttapcode",   // nên dùng biến môi trường
    resave: false,
    saveUninitialized: false,  // Chỉ tạo session khi cần
    cookie: { 
        secure: process.env.NODE_ENV === 'production',  // HTTPS trong production
        httpOnly: true,   
        maxAge: 1000 * 60 * 60 * 24 * 7  // 7 ngày
    }
}));

// Static files
app.use("/assets", express.static(path.join(__dirname, "./src/assets")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// DB
connectDB();

// Routes
route(app);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        status: err.status || 500,
        success: false,
        message: err.message || "Internal Server Error"
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 404,
        success: false,
        message: "Route not found"
    });
});

const PORT = process.env.PORT || port;

app.listen(PORT, () => {
  console.log("=".repeat(50));
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📝 Login page: http://localhost:${PORT}/login`);
  console.log(`📸 Face registration: http://localhost:${PORT}/registerFace`);
  console.log("=".repeat(50));
});
