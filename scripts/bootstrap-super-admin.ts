/**
 * Bootstrap script: creates the first platform super_admin user.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-super-admin.ts <username> <password> [email]
 *
 * This is intended to be run once against a fresh database (or whenever
 * no super_admin exists yet). It refuses to run if a user with the same
 * username already exists.
 */
import bcrypt from "bcrypt";
import { storage } from "../server/storage";

async function main() {
  const [username, password, email] = process.argv.slice(2);

  if (!username || !password) {
    console.error("Usage: npx tsx scripts/bootstrap-super-admin.ts <username> <password> [email]");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters long.");
    process.exit(1);
  }

  const existing = await storage.getUserByUsername(username);
  if (existing) {
    console.error(`A user with username "${username}" already exists.`);
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await storage.createUser({
    companyId: null,
    username,
    password: hashedPassword,
    email: email || null,
    role: "super_admin",
  });

  console.log(`Super admin user created successfully:`);
  console.log(`  id:       ${user.id}`);
  console.log(`  username: ${user.username}`);
  console.log(`  role:     ${user.role}`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed to create super admin user:", error);
  process.exit(1);
});
