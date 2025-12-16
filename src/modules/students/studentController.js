import Student from "../students/student.js"
import Student_Class from "../students/student_class.js"
import Attendance from "../attendance/attendance.js"
import Student_Absent from "../students/student_absent.js"
import Class from "../classes/class.js"
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";


const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function addStudent(req, res) {
    const newStudent = req.body;
    
    // Validation
    if (!newStudent.studentId || !newStudent.name || !newStudent.dob || !newStudent.classId) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: "Thiếu thông tin: studentId, name, classId hoặc dob"
        });
    }
    
    // Sanitize input
    const studentId = String(newStudent.studentId).trim();
    const studentName = String(newStudent.name).trim();
    const classId = parseInt(newStudent.classId);
   
    
    try {
        let student = await Student.findOne({
            where : { student_id : studentId}
        })
        if (!student){
            await Student.create({
                student_name: studentName,
                student_id : studentId,
                dob : newStudent.dob
            })
        }
        const existingStudentClass = await Student_Class.findOne({
            where : { student_id : studentId, class_id: classId}
        })
        if (existingStudentClass){
            return res.status(200).json({
            status: 200,
            success: false,
            message: "Học sinh đã tồn tại trong lớp này"
        }); 
        }
        await Student_Class.create({
            student_id: String(studentId),
            class_id: classId,
            number_of_days_off : 0
        })

        // Increase class total
        const classInfo = await Class.findByPk(classId);
        if (classInfo) {
            await classInfo.update({ total: classInfo.total + 1 });
        }

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
        });
    }
}

export async function getStudents(req, res) {
    const { classId } = req.query;

    if (!classId) {
        return res.status(400).json({
            status: 400,
            success: false,
            message: "Thiếu classId"
        });
    }

    try {
        const studentClasses = await Student_Class.findAll({
            where: { class_id: classId }
        });

        if (!studentClasses || studentClasses.length === 0) {
            return res.status(200).json({
                status: 200,
                success: false,
                message: "Không tìm thấy học sinh"
            });
        }

        let studentsList = [];

        for (const sc of studentClasses) {
            const student = await Student.findOne({
                where: { student_id: sc.student_id }
            });

            if (student) {
                // Check if student has registered face
                const projectRoot = path.resolve(__dirname, '../../..');
                const knownFacesDir = path.join(projectRoot, 'known_faces');
                let hasFace = false;

                if (fs.existsSync(knownFacesDir)) {
                    // Search for folder starting with student_id
                    const files = fs.readdirSync(knownFacesDir);
                    // Mẫu tên folder: {student_id}_{student_name}
                    // Cần match chính xác student_id ở đầu
                    const studentFolder = files.find(f => {
                         const parts = f.split('_');
                         return parts[0] === String(student.student_id);
                    });
                     
                    if (studentFolder) {
                        const folderPath = path.join(knownFacesDir, studentFolder);
                         // Check if folder is not empty
                        if(fs.existsSync(folderPath)){
                             const faceFiles = fs.readdirSync(folderPath);
                             if(faceFiles.length > 0) hasFace = true;
                        }
                    }
                }

                studentsList.push({
                    ...student.dataValues,       // thông tin sinh viên
                    number_of_days_off: sc.number_of_days_off ?? 0,  // số ngày vắng
                    hasFace: hasFace
                });
            }
        }

        return res.status(200).json({
            status: 200,
            success: true,
            data: studentsList
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

export async function checkFace(req, res) {
    try {
        let imageBase64 = null;

        // Kiểm tra nếu có file upload
        if (req.file) {
            // Đọc file và convert sang base64
            const fileBuffer = fs.readFileSync(req.file.path);
            imageBase64 = fileBuffer.toString('base64');
            // Xóa file tạm
            fs.unlinkSync(req.file.path);
        } 
        // Kiểm tra nếu có base64 trong body
        else if (req.body.image) {
            imageBase64 = req.body.image;
            // Remove data URL prefix nếu có
            if (imageBase64.includes(',')) {
                imageBase64 = imageBase64.split(',')[1];
            }
        } 
        else {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu ảnh. Gửi file hoặc base64 string trong field 'image'"
            });
        }

        if (!imageBase64) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Không thể đọc dữ liệu ảnh"
            });
        }

        // Gọi Python service - sử dụng file tạm để tránh lỗi với base64 dài
        const projectRoot = path.resolve(__dirname, '../../..');
        const pythonScript = path.join(projectRoot, 'face_recognition_service.py');
        const tempImagePath = path.join(projectRoot, 'uploads', 'temp', `face_check_${Date.now()}.jpg`);
        
        // Tạo thư mục nếu chưa có
        const tempDir = path.dirname(tempImagePath);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        // Lưu base64 vào file tạm
        const imageBuffer = Buffer.from(imageBase64, 'base64');
        fs.writeFileSync(tempImagePath, imageBuffer);
        
        // Gọi Python script với đường dẫn file
        // Trên Windows thử python trước, trên Unix thử python3
        // Check for .venv python first
        const isWindows = process.platform === 'win32';
        const venvPythonPath = isWindows 
            ? path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
            : path.join(projectRoot, '.venv', 'bin', 'python');

        let pythonCommand;

        if (fs.existsSync(venvPythonPath)) {
            pythonCommand = venvPythonPath;
        } else {
            pythonCommand = isWindows ? 'python' : 'python3';
            try {
                await execAsync(`"${pythonCommand}" --version`, { timeout: 5000 });
            } catch {
                pythonCommand = isWindows ? 'python3' : 'python';
                try {
                    await execAsync(`"${pythonCommand}" --version`, { timeout: 5000 });
                } catch (error) {
                    // Cleanup temp file
                    try {
                        if (fs.existsSync(tempImagePath)) {
                            fs.unlinkSync(tempImagePath);
                        }
                    } catch {}
                    throw new Error('Không tìm thấy Python. Vui lòng cài đặt Python và thêm vào PATH.');
                }
            }
        }
        
        let stdout = '';
        let stderr = '';
        
        try {
            const result = await execAsync(
                `"${pythonCommand}" "${pythonScript}" file "${tempImagePath}"`,
                { 
                    encoding: 'utf8',
                    maxBuffer: 10 * 1024 * 1024, // 10MB
                    timeout: 30000, // 30 seconds timeout
                    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
                }
            );
            stdout = result.stdout;
            stderr = result.stderr || '';
        } catch (error) {
            // Xóa file tạm
            try {
                if (fs.existsSync(tempImagePath)) {
                    fs.unlinkSync(tempImagePath);
                }
            } catch {}
            
            console.error('Python execution error:', error);
            throw new Error(`Lỗi khi chạy Python script: ${error.message}`);
        }
        
        // Xóa file tạm
        try {
            if (fs.existsSync(tempImagePath)) {
                fs.unlinkSync(tempImagePath);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up temp file:', cleanupError);
        }

        // Log stderr nếu có (trừ warnings)
        if (stderr && !stderr.includes('Warning') && !stderr.includes('Loaded:')) {
            console.error('Python stderr:', stderr);
        }

        // Parse JSON output
        let result;
        try {
            // Loại bỏ các dòng debug từ stderr nếu có trong stdout
            const cleanOutput = stdout.trim().split('\n').filter(line => {
                return !line.includes('Loaded:') && line.trim().startsWith('{');
            }).join('\n') || stdout.trim();
            
            result = JSON.parse(cleanOutput);
        } catch (parseError) {
            console.error('JSON parse error. stdout:', stdout);
            console.error('stderr:', stderr);
            throw new Error(`Lỗi khi parse kết quả từ Python: ${parseError.message}`);
        }

        if (!result.success) {
            return res.status(200).json({
                status: 200,
                success: false,
                message: result.message || "Không thể nhận diện khuôn mặt"
            });
        }

        // Lấy thông tin chi tiết của học sinh từ database
        const recognizedStudents = [];
        
        for (const name of result.names) {
            if (name !== "Unknown") {
                const student = await Student.findOne({
                    where: { student_name: name }
                });
                
                if (student) {
                    recognizedStudents.push({
                        student_id: student.student_id,
                        student_name: student.student_name,
                        id: student.id
                    });
                } else {
                    recognizedStudents.push({
                        student_name: name,
                        note: "Không tìm thấy trong database"
                    });
                }
            }
        }

        return res.status(200).json({
            status: 200,
            success: true,
            data: {
                recognized_count: recognizedStudents.length,
                students: recognizedStudents,
                all_names: result.names
            }
        });

    } catch (error) {
        console.error('Error in checkFace:', error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi xử lý nhận diện khuôn mặt.",
            error: error.message
        });
    }
}

export async function registerFace(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu file ảnh"
            });
        }

        const { studentId, studentName } = req.body;

        if (!studentId || !studentName) {
            // Xóa file tạm nếu có
            if (req.file.path) {
                try {
                    fs.unlinkSync(req.file.path);
                } catch {}
            }
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu thông tin studentId hoặc studentName"
            });
        }

        // Tạo thư mục known_faces nếu chưa có
        const projectRoot = path.resolve(__dirname, '../../..');
        const knownFacesDir = path.join(projectRoot, 'known_faces');
        
        if (!fs.existsSync(knownFacesDir)) {
            fs.mkdirSync(knownFacesDir, { recursive: true });
        }

        // Tạo folder riêng cho mỗi học sinh: {studentId}_{studentName}
        // Chỉ loại bỏ ký tự không hợp lệ của path, giữ nguyên dấu tiếng Việt để khớp DB
        const sanitizedStudentId = String(studentId).replace(/[\\/:*?"<>|]/g, '_');
        const sanitizedStudentName = String(studentName).replace(/[\\/:*?"<>|]/g, '_');
        const studentFolder = `${sanitizedStudentId}_${sanitizedStudentName}`;
        const studentFolderPath = path.join(knownFacesDir, studentFolder);
        
        if (!fs.existsSync(studentFolderPath)) {
            fs.mkdirSync(studentFolderPath, { recursive: true });
        }

        // Tạo tên file: {studentId}_{studentName}_{timestamp}.jpg
        const timestamp = Date.now();
        const filename = `${sanitizedStudentId}_${sanitizedStudentName}_${timestamp}.jpg`;
        const destinationPath = path.join(studentFolderPath, filename);

        // Copy file từ temp sang known_faces
        fs.copyFileSync(req.file.path, destinationPath);

        // Xóa file tạm
        try {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up temp file:', cleanupError);
        }

        // Tạo hoặc cập nhật student trong database
        try {
            let student = await Student.findOne({
                where: { student_id: studentId }
            });

            if (!student) {
                await Student.create({
                    student_name: studentName,
                    student_id: studentId
                });
            } else {
                // Cập nhật tên nếu khác
                if (student.student_name !== studentName) {
                    await student.update({
                        student_name: studentName
                    });
                }
            }
        } catch (dbError) {
            console.error('Database error (non-critical):', dbError);
            // Không fail request nếu DB lỗi, vì ảnh đã được lưu
        }

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Đã lưu ảnh thành công",
            data: {
                filename: filename,
                studentId: studentId,
                studentName: studentName
            }
        });

    } catch (error) {
        console.error('Error in registerFace:', error);
        
        // Xóa file tạm nếu có
        if (req.file && req.file.path) {
            try {
                if (fs.existsSync(req.file.path)) {
                    fs.unlinkSync(req.file.path);
                }
            } catch {}
        }

        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi lưu ảnh khuôn mặt.",
            error: error.message
        });
    }
}

// Nhận diện khuôn mặt và trả về danh sách tên (không cần class)
// Nhận diện khuôn mặt và trả về danh sách tên, kiểm tra lớp nếu có
export async function doneCheck(req, res) {
    try {
        let imageBase64 = null;
        const { classId } = req.body; // Lấy classId từ form data

        // Lấy ảnh từ file upload hoặc base64
        if (req.file) {
            const fileBuffer = fs.readFileSync(req.file.path);
            imageBase64 = fileBuffer.toString('base64');
            fs.unlinkSync(req.file.path);
        } else if (req.body.image) {
            imageBase64 = req.body.image;
            if (imageBase64.includes(',')) {
                imageBase64 = imageBase64.split(',')[1];
            }
        } else {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu ảnh. Gửi file hoặc base64 string trong field 'image'"
            });
        }

        if (!imageBase64) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Không thể đọc dữ liệu ảnh"
            });
        }

        // Gọi Python service checkFace
        const projectRoot = path.resolve(__dirname, '../../..');
        const pythonScript = path.join(projectRoot, 'face_recognition_service.py');
        const tempImagePath = path.join(projectRoot, 'uploads', 'temp', `done_check_${Date.now()}.jpg`);

        if (!fs.existsSync(path.dirname(tempImagePath))) {
            fs.mkdirSync(path.dirname(tempImagePath), { recursive: true });
        }

        fs.writeFileSync(tempImagePath, Buffer.from(imageBase64, 'base64'));

        // Check for .venv python first
        const isWindows = process.platform === 'win32';
        const venvPythonPath = isWindows 
            ? path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
            : path.join(projectRoot, '.venv', 'bin', 'python');

        let pythonCommand;

        if (fs.existsSync(venvPythonPath)) {
            pythonCommand = venvPythonPath;
        } else {
            pythonCommand = isWindows ? 'python' : 'python3';
            try {
                await execAsync(`"${pythonCommand}" --version`, { timeout: 5000 });
            } catch {
                pythonCommand = isWindows ? 'python3' : 'python';
            }
        }

        let result;
        try {
            const { stdout, stderr } = await execAsync(
                `"${pythonCommand}" "${pythonScript}" file "${tempImagePath}"`,
                {
                    encoding: 'utf8',
                    maxBuffer: 10 * 1024 * 1024,
                    timeout: 30000,
                    env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
                }
            );

            if (stderr && !stderr.includes('Warning') && !stderr.includes('Loaded:')) {
                console.error('Python stderr:', stderr);
            }

            const cleanOutput = stdout.trim().split('\n').filter(line => {
                return line.trim().startsWith('{');
            }).join('\n') || stdout.trim();
            result = JSON.parse(cleanOutput);

        } catch (execError) {
             try { fs.unlinkSync(tempImagePath); } catch {}
             console.error('Execution error:', execError);
             return res.status(500).json({ success: false, message: "Lỗi nhận diện: " + execError.message });
        }
        
        try { fs.unlinkSync(tempImagePath); } catch {}

        if (!result.success) {
            return res.status(200).json({
                status: 200,
                success: false,
                message: result.message || "Không thể nhận diện khuôn mặt"
            });
        }

        // Xử lý kết quả nhận diện
        const recognizedStudents = [];
        const warnings = [];
        
        for (const name of result.names) {
            if (name !== "Unknown") {
                const student = await Student.findOne({
                    where: { student_name: name }
                });

                if (student) {
                    let isValid = true;
                    let warningMsg = "";

                    // Nếu có classId, kiểm tra xem học sinh có trong lớp không
                    if (classId) {
                        const enrollment = await Student_Class.findOne({
                            where: { 
                                student_id: student.student_id,
                                class_id: classId
                            }
                        });

                        if (!enrollment) {
                            isValid = false;
                            warningMsg = `Học sinh ${student.student_name} (${student.student_id}) không thuộc lớp này`;
                        } else {
                            // Nếu trong lớp, ghi nhận điểm danh (Attendance)
                            try {
                                // Kiểm tra xem hôm nay đã điểm danh chưa để tránh duplicates log (tùy chọn)
                                // Ở đây cứ log record mới như markAttendance cũ
                                await Attendance.create({
                                    student_id: student.student_id,
                                    class_id: classId,
                                    check_time: new Date()
                                });
                            } catch (attError) {
                                console.error("Lỗi ghi attendance:", attError);
                            }
                        }
                    }

                    if (isValid) {
                        recognizedStudents.push({
                            student_id: student.student_id,
                            student_name: student.student_name,
                            id: student.id,
                            timestamp: new Date()
                        });
                    } else {
                        warnings.push({
                            student_id: student.student_id,
                            student_name: student.student_name,
                            message: warningMsg
                        });
                    }
                } else {
                    warnings.push({
                        student_name: name,
                        message: "Không tìm thấy thông tin trong database"
                    });
                }
            } else {
                // Unknown faces
            }
        }

        return res.status(200).json({
            status: 200,
            success: true,
            data: {
                students: recognizedStudents,
                warnings: warnings
            }
        });

    } catch (error) {
        console.error('Error in doneCheck:', error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi nhận diện khuôn mặt.",
            error: error.message
        });
    }
}

export async function markAttendance(req, res) {
    try {
        const { classId, studentId, studentName, timestamp } = req.body;

        // Validation
        if (!classId || !studentId) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu thông tin classId hoặc studentId"
            });
        }

        // Kiểm tra học sinh có trong lớp không
        const studentClass = await Student_Class.findOne({
            where: {
                student_id: studentId,
                class_id: classId
            }
        });

        if (!studentClass) {
            return res.status(200).json({
                status: 200,
                success: false,
                message: "Học sinh không thuộc lớp này"
            });
        }

        // Cập nhật số ngày vắng (giảm nếu đã điểm danh hôm nay)
        // Hoặc có thể tạo bảng attendance riêng để lưu lịch sử
        // Ở đây tạm thời chỉ trả về thành công
        
        // Create attendance record
        await Attendance.create({
            student_id: studentId,
            class_id: classId,
            check_time: timestamp || new Date()
        });
        
        return res.status(200).json({
            status: 200,
            success: true,
            message: "Điểm danh thành công",
            data: {
                studentId: studentId,
                studentName: studentName || studentClass.student_id,
                classId: classId,
                timestamp: timestamp || new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error in markAttendance:', error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi điểm danh.",
            error: error.message
        });
    }
}

export async function getAttended(req, res) {
    try {
        // Support both GET (query) and POST (body)
        const classId = req.query.classId || req.body.classId;

        if (!classId) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu classId"
            });
        }

        // Get today's attendance for the class
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { Op } = (await import("sequelize")).default; // Dynamic import for Op if not available globally or use sequelize.Op if passed

        // Better to use the Op from the sequelize instance or import it at top. 
        // student.js uses DataTypes. 
        // I will rely on Sequelize.Op which is usually available if I import Sequelize.
        // But let's check imports. I didn't import Sequelize in this file.
        // It's safer to import Op.
        
        // However, I can just fetch all and filter, or use raw query.
        // OR better, import Op at the top. But I can't edit top easily with multi_replace if not contiguous.
        // I'll use dynamic import for simplicity in this chunk or assume standard Sequelize usage.
        
        // Actually, let's look at `checkFace` which used `Student.findOne`.
        // I'll stick to basic find usage.
        // For date range, I need Op.
        
        const attended = await Attendance.findAll({
            where: {
                class_id: classId,
                // Simple date check: match today
                // Since I didn't import Op, I'll filter in JS if the list is small, 
                // OR I will add Op import in the first chunk.
            }
        });
        
        // Filter for today if not done in DB
        const todayStr = new Date().toDateString();
        const attendedToday = attended.filter(a => new Date(a.check_time).toDateString() === todayStr);

        const studentIds = attendedToday.map(a => a.student_id);
        // Unique IDs
        const uniqueStudentIds = [...new Set(studentIds)];

        return res.status(200).json({
            status: 200,
            success: true,
            data: uniqueStudentIds
        });

    } catch (error) {
        console.error('Error in getAttended:', error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi lấy danh sách điểm danh.",
            error: error.message
        });
    }
}

export async function deleteStudent(req, res) {
    try {
        const { studentId, classId } = req.body;

        if (!studentId) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu studentId"
            });
        }

        // 1. Kiểm tra xem học sinh có tồn tại không
        const student = await Student.findOne({
            where: { student_id: studentId }
        });

        if (!student) {
            return res.status(404).json({
                status: 404,
                success: false,
                message: "Học sinh không tồn tại"
            });
        }

        // 2. Kiểm tra số lượng lớp học sinh này đang tham gia
        const enrollments = await Student_Class.findAll({
            where: { student_id: studentId }
        });

        const enrollmentCount = enrollments.length;
        const isInOtherClasses = enrollmentCount > 1;

        // Nếu có classId được gửi lên, ta ưu tiên xử lý logic theo ngữ cảnh lớp học
        if (classId) {
            // Kiểm tra xem học sinh có trong lớp này không
            const currentEnrollment = enrollments.find(e => e.class_id == classId);
            
            if (currentEnrollment) {
                if (isInOtherClasses) {
                    // CASE A: Học sinh đang học nhiều lớp -> Chỉ xóa khỏi lớp hiện tại
                    await currentEnrollment.destroy();
                    
                     // Xóa attendance của lớp này để sạch dữ liệu
                    try {
                        await Attendance.destroy({ where: { student_id: studentId, class_id: classId } });
                        // Xóa absences trong lớp này
                        await Student_Absent.destroy({ where: { student_id: studentId, class_id: classId } });

                        // Giảm sĩ số lớp
                        const classInfo = await Class.findByPk(classId);
                        if (classInfo && classInfo.total > 0) {
                            await classInfo.update({ total: classInfo.total - 1 });
                        }
                    } catch (e) { console.error("Error clearing data:", e); }

                    return res.status(200).json({
                        status: 200,
                        success: true,
                        message: "Đã xóa học sinh khỏi lớp này (Học sinh vẫn còn trong các lớp khác)"
                    });
                }
                // Nếu không ở lớp khác, fall through xuống logic xóa hoàn toàn bên dưới
                // Nếu không ở lớp khác, fall through xuống logic xóa hoàn toàn bên dưới
            } else {
                 return res.status(404).json({
                    status: 404,
                    success: false,
                    message: "Học sinh không thuộc lớp này"
                });
            }
        }

        // CASE B: Xóa hoàn toàn
        
        // 3. Xóa folder ảnh
        const projectRoot = path.resolve(__dirname, '../../..');
        const knownFacesDir = path.join(projectRoot, 'known_faces');
        
        if (fs.existsSync(knownFacesDir)) {
            const files = fs.readdirSync(knownFacesDir);
            const sanitizedId = String(studentId).replace(/[\\/:*?"<>|]/g, '_');
            const targetFolder = files.find(f => f.startsWith(`${sanitizedId}_`));
            
            if (targetFolder) {
                const folderPath = path.join(knownFacesDir, targetFolder);
                try {
                    fs.rmSync(folderPath, { recursive: true, force: true });
                    console.log(`Deleted folder: ${folderPath}`);
                } catch (err) {
                    console.error("Error deleting folder:", err);
                }
            }
        }

        // 4. Update Classes Total before deleting enrollments
        for (const enrollment of enrollments) {
            try {
                const cls = await Class.findByPk(enrollment.class_id);
                if (cls && cls.total > 0) {
                   await cls.update({ total: cls.total - 1 });
                }
            } catch (e) {}
        }

        // 5. Xóa record DB
        await Student_Class.destroy({ where: { student_id: studentId } });
        try {
             await Attendance.destroy({ where: { student_id: studentId } });
             await Student_Absent.destroy({ where: { student_id: studentId } });
        } catch (e) {}
        await student.destroy();

        return res.status(200).json({
            status: 200,
            success: true,
            message: "Đã xóa hoàn toàn học sinh và dữ liệu hình ảnh"
        });

    } catch (error) {
        console.error('Error in deleteStudent:', error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi xóa học sinh.",
            error: error.message
        });
    }
}

export async function finishAttendance(req, res) {
    try {
        const { classId, presentStudentIds } = req.body;

        if (!classId) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu classId"
            });
        }

        // 1. Lấy danh sách tất cả học sinh trong lớp
        const allStudentsInClass = await Student_Class.findAll({
            where: { class_id: classId }
        });

        if (!allStudentsInClass || allStudentsInClass.length === 0) {
            return res.status(200).json({
                status: 200,
                success: false,
                message: "Lớp này không có học sinh nào"
            });
        }

        const presentSet = new Set(presentStudentIds || []);
        let absentCount = 0;
        const absentDetails = [];

        // 2. Xác định học sinh vắng check attendance
        for (const enrollment of allStudentsInClass) {
            // student_id trong Student_Class là String
            const studentId = enrollment.student_id; 

            if (!presentSet.has(studentId)) {
                // Đây là học sinh vắng
                absentCount++;

                // A. Tăng số ngày nghỉ
                const currentDaysOff = enrollment.number_of_days_off || 0;
                await enrollment.update({
                    number_of_days_off: currentDaysOff + 1
                });

                // B. Lấy tên học sinh để lưu vào bảng Student_Absent
                // Cần query bảng Student để lấy tên
                const studentInfo = await Student.findOne({
                     where: { student_id: studentId }
                });
                const studentName = studentInfo ? studentInfo.student_name : "Unknown";

                // C. Lưu vào bảng Student_Absent
                await Student_Absent.create({
                    student_id: studentId,
                    student_name: studentName,
                    class_id: classId,
                    absent_days: new Date()
                });
                
                absentDetails.push(studentId);
            }
        }

        return res.status(200).json({
            status: 200,
            success: true,
            message: `Hoàn tất điểm danh. Có ${absentCount} học sinh vắng.`,
            data: {
                total: allStudentsInClass.length,
                present: presentSet.size,
                absent: absentCount,
                absentList: absentDetails
            }
        });

    } catch (error) {
        console.error('Error in finishAttendance:', error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi kết thúc điểm danh.",
            error: error.message
        });
    }
}

export async function getStudentAbsences(req, res) {
    try {
        const { studentId, classId } = req.query;

        if (!studentId) {
            return res.status(400).json({
                status: 400,
                success: false,
                message: "Thiếu studentId"
            });
        }

        const whereClause = { student_id: studentId };
        if (classId) {
            whereClause.class_id = classId;
        }

        const absences = await Student_Absent.findAll({
            where: whereClause,
            order: [['absent_days', 'DESC']]
        });

        return res.status(200).json({
            status: 200,
            success: true,
            data: absences
        });

    } catch (error) {
        console.error('Error in getStudentAbsences:', error);
        return res.status(500).json({
            status: 500,
            success: false,
            message: "Lỗi server khi lấy lịch sử vắng.",
            error: error.message
        });
    }
}

