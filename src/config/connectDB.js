import { Sequelize } from "sequelize";

const sequelize = new Sequelize("facecheckdb", "root", null, {
  host: "localhost",
  dialect: "mysql",
  logging: false,
});

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected!");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
  }
}

export default   sequelize;
export {connectDB };
