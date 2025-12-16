import express from 'express';
const router = express.Router();

import {getClass, addClass, deleteClass} from "../classes/classController.js";

router.get("/class/getClass", getClass);
router.post("/class/addClass", addClass)
router.post("/class/deleteClass", deleteClass)

export default router;