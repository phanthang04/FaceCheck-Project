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

        const sanitizedStudentId = String(studentId).replace(/[\\/:*?"<>|]/g, '_');
        const sanitizedStudentName = String(studentName).replace(/[\\/:*?"<>|]/g, '_');
        const studentFolder = `${sanitizedStudentId}_${sanitizedStudentName}`;
        const studentFolderPath = path.join(knownFacesDir, studentFolder);
        
        if (!fs.existsSync(studentFolderPath)) {
            fs.mkdirSync(studentFolderPath, { recursive: true });
        }

        const timestamp = Date.now();
        const filename = `${sanitizedStudentId}_${sanitizedStudentName}_${timestamp}.jpg`;
        const destinationPath = path.join(studentFolderPath, filename);

        fs.copyFileSync(req.file.path, destinationPath);

        try {
            if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
        } catch (cleanupError) {
            console.error('Error cleaning up temp file:', cleanupError);
        }

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
                if (student.student_name !== studentName) {
                    await student.update({
                        student_name: studentName
                    });
                }
            }
        } catch (dbError) {
            console.error('Database error (non-critical):', dbError);
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

        for (const enrollment of allStudentsInClass) {
            const studentId = enrollment.student_id; 

            if (!presentSet.has(studentId)) {
                absentCount++;
                const currentDaysOff = enrollment.number_of_days_off || 0;
                await enrollment.update({
                    number_of_days_off: currentDaysOff + 1
                });
                const studentInfo = await Student.findOne({
                     where: { student_id: studentId }
                });
                const studentName = studentInfo ? studentInfo.student_name : "Unknown";

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

