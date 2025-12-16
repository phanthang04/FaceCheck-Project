import { DataTypes } from "sequelize";
import sequelize from "../../config/connectDB.js";

const Student_Absent = sequelize.define("Student_Absent", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  student_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  absent_days: {
    type: DataTypes.DATE,
    defaultValue: 0
  }
}, {
  tableName: "student_absent", 
  timestamps: false 
});

export default Student_Absent;