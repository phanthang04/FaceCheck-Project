import express from "express";
import accountAPI from "../modules/account/accountAPI.js";
import classAPI from "../modules/classes/classAPI.js";
import studentAPI from "../modules/students/studentAPI.js";
import documentAPI from "../modules/documents/documentAPI.js";

const router = express.Router();

router.use("/api", accountAPI);
router.use("/api", classAPI);
router.use("/api", studentAPI);
router.use("/api", documentAPI);

export default router;
