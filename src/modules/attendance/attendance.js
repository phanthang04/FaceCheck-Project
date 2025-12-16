import { DataTypes } from "sequelize";
import sequelize from "../../config/connectDB.js";

const Attendance = sequelize.define("Attendance", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  check_time: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: "attendance",
  timestamps: false
});

export default Attendance;
