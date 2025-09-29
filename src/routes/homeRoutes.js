// src/routes/homeRoutes.js
import express from "express";
import homeController from "../controller/homeController.js"; // nhớ có .js

const router = express.Router();

router.get("/signUp", homeController.signUp);
router.get("/login", homeController.login);
router.get("/", homeController.index);

export default router;   // ✅ dùng export default
