import Class from "./class.js";

export async function getClass(req, res) {
    const id = req.session.accountId;
    try {
        if (!id) {
            return res.status(200).json({
                status: 200,
                success: false,
                message: "Vui lòng đăng nhập"
            });
        }
        const classes = await Class.findAll({
            where: { teacherId: id }
        });
        if (!classes || classes.length === 0){
            return res.status(200).json({
                status: 200,
                success: false,
                message: "Không tìm thấy lớp học"
            });
        }
        return res.status(200).json({
            status: 200,
            success: true,
            data : classes
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server.",
            error: error.message
        });
    }
}

export async function addClass(req, res) {
    const id = req.session.accountId;
    const newClass = req.body;
    
    if (!id) {
        return res.status(200).json({
            status: 200,
            success: false,
            message: "Vui lòng đăng nhập"
        });
    }
    
    if (!newClass.subject || !newClass.name || !newClass.room) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: "Thiếu thông tin lớp học"
        });
    }
    
    try {
        await Class.create({
            subject: newClass.subject,
            nameClass: newClass.name,
            room: newClass.room,
            total: 0,
            teacherId: id
        })
        return res.status(200).json({
            status: 200,
            success: true,
            message: "Thêm thành công"
        });  
    } catch (error) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server.",
            error: error.message
        })
    }
}

export async function deleteClass(req, res) {
    const id = req.session.accountId;
    const { classId } = req.body;

    if (!id) {
        return res.status(200).json({
            status: 200,
            success: false,
            message: "Vui lòng đăng nhập"
        });
    }

    if (!classId) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: "Thiếu thông tin lớp học cần xóa"
        });
    }

    try {
        const classToDelete = await Class.findOne({
            where: { 
                id: classId,
                teacherId: id 
            }
        });

        if (!classToDelete) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: "Không tìm thấy lớp học hoặc bạn không có quyền xóa"
            });
        }

        await classToDelete.destroy();

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Xóa lớp thành công"
        });
    } catch (error) {
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi xóa lớp",
            error: error.message
        });
    }
}