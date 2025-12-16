
import Student_Document from "../students/student_document.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function uploadDocument(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Vui lòng chọn file!"
            });
        }

        const { classId } = req.body;
        if (!classId) {
             // Clean up if no classId
             if (req.file.path) fs.unlinkSync(req.file.path);
             return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu classId"
            });
        }

        // Create DB record
        const newDoc = await Student_Document.create({
            file_name: req.file.originalname,
            file_path: 'uploads/documents/' + req.file.filename, // Store relative path
            file_type: path.extname(req.file.originalname).substring(1),
            class_id: classId
        });

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Upload thành công",
            data: newDoc
        });

    } catch (error) {
        console.error("Upload error:", error);
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi upload file.",
            error: error.message
        });
    }
}

export async function getDocuments(req, res) {
    try {
        const { classId } = req.query;
        if (!classId) {
             return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu classId"
            });
        }

        const documents = await Student_Document.findAll({
            where: { class_id: classId },
            order: [['uploaded_at', 'DESC']]
        });

        return res.status(200).json({
            status: 200,
            success: true,
            data: documents
        });

    } catch (error) {
         console.error("Get documents error:", error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi lấy danh sách tài liệu.",
            error: error.message
        });
    }
}

export async function deleteDocument(req, res) {
    try {
        const { id } = req.body;
        if (!id) {
             return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu id tài liệu"
            });
        }

        const doc = await Student_Document.findByPk(id);
        if (!doc) {
             return res.status(404).json({
                status: 404,
                success: false,
                message: "Tài liệu không tồn tại"
            });
        }

        // Delete file from disk
        const projectRoot = path.resolve(__dirname, '../../../');
        const absolutePath = path.join(projectRoot, doc.file_path);
        
        if (fs.existsSync(absolutePath)) {
            try {
                fs.unlinkSync(absolutePath);
            } catch (err) {
                console.error("Error deleting file from disk:", err);
            }
        }

        // Delete from DB
        await doc.destroy();

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Xóa tài liệu thành công"
        });

    } catch (error) {
         console.error("Delete document error:", error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi xóa tài liệu.",
            error: error.message
        });
    }
}
