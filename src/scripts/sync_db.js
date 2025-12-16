import sequelize from "../config/connectDB.js";
import Student from "../modules/students/student.js";
import Student_Class from "../modules/students/student_class.js";
import Attendance from "../modules/attendance/attendance.js";
import Class from "../modules/classes/class.js";
import Account from "../modules/account/account.js";

const syncDB = async () => {
  try {
    // Authenticate first
    await sequelize.authenticate();
    console.log("✅ Connection has been established successfully.");

    // Disable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });

    // Sync all models (force: true will DROP tables if they exist!)
    await sequelize.sync({ force: true });

    // Re-enable foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });
    
    console.log("✅ Database synchronized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Unable to connect to the database or sync:", error);
    process.exit(1);
  }
};

syncDB();
