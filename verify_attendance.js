
import http from 'http';

function post(path, data) {
    return new Promise((resolve, reject) => {
        const dataString = JSON.stringify(data);
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': dataString.length
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed);
                } catch (e) {
                    console.log('Raw body:', body);
                    reject(e);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(dataString);
        req.end();
    });
}

async function run() {
    const studentId = "TEST_" + Date.now();
    const classId = 9999;
    
    console.log(`Testing with StudentID: ${studentId}, ClassID: ${classId}`);

    try {
        // 1. Add Student
        console.log("1. Adding Student...");
        const addRes = await post('/api/student/addStudent', {
            studentId: studentId,
            name: "Test Verification Student",
            classId: classId
        });
        console.log("Add Student Response:", addRes);

        // 2. Mark Attendance
        console.log("2. Marking Attendance...");
        const markRes = await post('/api/students/markAttendance', {
            studentId: studentId,
            classId: classId,
            studentName: "Test Verification Student"
        });
        console.log("Mark Attendance Response:", markRes);

        if (!markRes.success) {
            console.error("Failed to mark attendance.");
             // Proceeding might fail but let's see.
             // If "Học sinh không thuộc lớp này", then addStudent might have failed to create association?
             // addStudent logs "Thêm thành công" or "Học sinh đã tồn tại..."
        }

        // 3. Get Attended
        console.log("3. Getting Attended List...");
        const attendedRes = await post('/api/attended', {
            classId: classId
        });
        console.log("Get Attended Response:", attendedRes);

        if (attendedRes.success && attendedRes.data.includes(studentId)) {
            console.log("✅ Verification SUCCESS: Student ID found in attended list.");
        } else {
            console.error("❌ Verification FAILED: Student ID NOT found in attended list.");
        }

    } catch (error) {
        console.error("Verification Error:", error);
    }
}

run();
