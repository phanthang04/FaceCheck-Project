import { DataTypes } from "sequelize";
import sequelize from "../../config/connectDB.js";

const Student_Document = sequelize.define("Student_Document", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  file_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  file_type: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  uploaded_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: "student_documents", 
  timestamps: false 
});

export default Student_Document;
