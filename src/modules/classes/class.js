import { DataTypes } from "sequelize";
import sequelize from "../../config/connectDB.js";

const Class = sequelize.define("Class", {
  nameClass: {
    type: DataTypes.STRING,
    allowNull: false
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  subject:{
    type: DataTypes.STRING,
    allowNull: false
  },
  room: {
    type: DataTypes.STRING
  },
  total:{
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: "class",  
  timestamps: false   
});

export default Class;
