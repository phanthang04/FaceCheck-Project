import { Sequelize } from "sequelize";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, "config.json"), "utf-8"));

const env = process.env.NODE_ENV || "development";
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database ,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

async function connectDB() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully!");
    console.log(`📊 Database: ${dbConfig.database} on ${dbConfig.host}`);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    console.error("💡 Please check your database configuration and ensure MySQL is running");
    process.exit(1); // Exit process if DB connection fails
  }
}

export default   sequelize;
export {connectDB };
