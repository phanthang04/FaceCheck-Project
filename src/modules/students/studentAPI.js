import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {getStudents, addStudent, checkFace, registerFace, markAttendance, doneCheck, getAttended, deleteStudent, finishAttendance, getStudentAbsences} from "../students/studentController.js";

// Cấu hình multer để lưu file tạm
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../../uploads/temp');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'face-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif)'));
        }
    }
});

router.post("/student/addStudent", addStudent);
router.get("/student/getStudents", getStudents);
router.post("/students/check", upload.single('image'), checkFace);
router.post("/students/registerFace", upload.single('image'), registerFace);
router.post("/students/markAttendance", markAttendance);
router.post("/students/done", upload.single('image'), doneCheck);
router.post("/attended", getAttended);
router.post("/student/deleteStudent", deleteStudent);
router.post("/student/finishAttendance", finishAttendance);
router.get("/student/absences", getStudentAbsences);

export default router;