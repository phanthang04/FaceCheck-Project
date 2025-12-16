// src/routes/homeRoutes.js
import express from "express";
import homeController from "../controller/homeController.js"; // nhớ có .js

const router = express.Router();

router.get("/signUp", homeController.signUp);
router.get("/login", homeController.login);
router.get("/studentsList", homeController.studentsList);
router.get("/registerFace", homeController.registerFace);
router.get("/attendance", homeController.attendance);
router.get("/documents", homeController.documents);
router.get("/", homeController.index);

export default router;   // ✅ dùng export default
