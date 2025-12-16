
import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { uploadDocument, getDocuments, deleteDocument } from './documentController.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Upload Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../../uploads/documents');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Keep original name but prepend timestamp to avoid collisions
        // decoding uri component to handle vietnamese chars if needed, but safe way is just use timestamp-orgname
        // Sanitize filename to avoid issues
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'); 
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + safeName);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: function (req, file, cb) {
         // Accept common document formats
        const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase().substring(1));
        // Mime type check can be tricky for some office files, relying mostly on extension for now or basic check
        if (extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận các file tài liệu (PDF, Office, Image)'));
        }
    }
});

router.post("/document/upload", upload.single('file'), uploadDocument);
router.get("/document/list", getDocuments);
router.post("/document/delete", deleteDocument);

export default router;
