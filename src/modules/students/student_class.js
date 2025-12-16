import { DataTypes } from "sequelize";
import sequelize from "../../config/connectDB.js";

const Student_Class = sequelize.define("Student_Class", {
  student_id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true, // ✅ Đánh dấu là 1 phần của khóa chính
    field: 'student_id' // Map đúng tên cột trong DB
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true, // ✅ Đánh dấu là phần còn lại của khóa chính
    field: 'class_id'
  },
  number_of_days_off: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: "student_class", // Tên bảng trong DB (như trong ảnh phpMyAdmin)
  timestamps: false // Tắt created_at, updated_at nếu bảng không có
});

// ✅ QUAN TRỌNG: Nếu bảng này không có cột `id` riêng,
// việc set 2 dòng `primaryKey: true` ở trên là BẮT BUỘC.
// Nó sẽ tạo thành "Composite Primary Key" (Khóa chính tổ hợp).

export default Student_Class;