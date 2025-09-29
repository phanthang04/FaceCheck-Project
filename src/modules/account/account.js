import { DataTypes } from "sequelize";
import sequelize from "../../config/connectDB.js";

const Account = sequelize.define("Account", {
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING
  }
}, {
  tableName: "account",  // tên bảng trong MySQL
  timestamps: false      // nếu bảng không có createdAt, updatedAt
});

export default Account;
