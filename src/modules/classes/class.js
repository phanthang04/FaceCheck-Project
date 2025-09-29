import { DataTypes } from "sequelize";
import sequelize from "../../config/connectDB.js";

const Class = sequelize.define("Class", {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "class",  // tên bảng trong MySQL
  timestamps: false      // nếu bảng không có createdAt, updatedAt
});

export default Class;
