import "dotenv/config";
import { pool } from "../shared/database/pool";
import { createHash } from "crypto";

interface AdminUser {
  name: string;
  email: string;
  password: string;
}

const ADMIN_USERS: AdminUser[] = [
  {
    name: "Admin One",
    email: "admin1@microfinance.local",
    password: "admin123456",
  },
  {
    name: "Admin Two",
    email: "admin2@microfinance.local",
    password: "admin123456",
  },
  {
    name: "Admin Three",
    email: "admin3@microfinance.local",
    password: "admin123456",
  },
  {
    name: "Admin Four",
    email: "admin4@microfinance.local",
    password: "admin123456",
  },
];

async function seed() {
  try {
    console.log("🌱 Seeding database with admin users...");

    // Clear existing users
    await pool.query("DELETE FROM users");

    // Insert admin users
    for (const admin of ADMIN_USERS) {
      const passwordHash = createHash("sha256")
        .update(admin.password)
        .digest("hex");

      await pool.query(
        "INSERT INTO users (email, name, password_hash, role) VALUES ($1, $2, $3, $4)",
        [admin.email, admin.name, passwordHash, "admin"],
      );

      console.log(`✅ Created admin: ${admin.email}`);
    }

    console.log("\n✅ Seeding completed successfully!\n");
    console.log("📝 Default Admin Credentials:");
    ADMIN_USERS.forEach((admin) => {
      console.log(`   Email: ${admin.email}`);
      console.log(`   Password: ${admin.password}\n`);
    });

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    await pool.end();
    process.exit(1);
  }
}

seed();
