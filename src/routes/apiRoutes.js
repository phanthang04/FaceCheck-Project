import express from "express";
import accountAPI from "../modules/account/accountAPI.js";

const router = express.Router();

router.use("/api", accountAPI);

export default router;
