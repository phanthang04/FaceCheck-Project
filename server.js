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
    secret: "pttapcode",   // thay bằng secret thực tế
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }    // nếu dùng HTTPS thì để true
}));

// Static files
app.use("/assets", express.static(path.join(__dirname, "./src/assets")));

// DB
connectDB();

// Routes
route(app);

app.listen(process.env.PORT || port, () => {
  console.log("Open http://localhost:" + port + "/login");
});
