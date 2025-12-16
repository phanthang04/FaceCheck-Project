import { DataTypes } from "sequelize";
import sequelize from "../../config/connectDB.js";

const Student = sequelize.define("Student", {

  student_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  student_id:{
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true // ✅ Đặt làm khóa chính
  },
  dob:{
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: "student",  
  timestamps: false   
});

export default Student;
