/**
 * Setup Script for Meme Capsule Multi-User Categorisation System
 * 
 * Generates secure SHA-256 password hashes and outputs SQL INSERT statements
 * ready to paste into the Cloudflare D1 Console or run via Wrangler CLI.
 * 
 * Usage:
 *   npx tsx scripts/setup-cat-users.ts
 */

import { createHash, randomBytes } from "crypto";
import * as readline from "readline";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function generateUserId(): string {
  return `user-${randomBytes(4).toString("hex")}`;
}

const defaultAccounts = [
  { username: "superadmin", display_name: "Super Admin", role: "superadmin", defaultPass: "changeme123" },
  { username: "judge1",     display_name: "Judge One",    role: "judge",      defaultPass: "changeme123" },
  { username: "judge2",     display_name: "Judge Two",    role: "judge",      defaultPass: "changeme123" },
  { username: "judge3",     display_name: "Judge Three",  role: "judge",      defaultPass: "changeme123" }
];

async function main() {
  console.log("\n========================================================");
  console.log(" 🎭 MEME CAPSULE — JUDGE ACCOUNTS SETUP GENERATOR");
  console.log("========================================================\n");

  const sqlStatements: string[] = [];

  for (const acc of defaultAccounts) {
    const hash = hashPassword(acc.defaultPass);
    const userId = generateUserId();
    const sql = `INSERT OR REPLACE INTO cat_users (id, username, display_name, password_hash, role, is_active) VALUES ('${userId}', '${acc.username}', '${acc.display_name}', '${hash}', '${acc.role}', 1);`;
    sqlStatements.push(sql);

    console.log(`[Account] ${acc.username} (${acc.role})`);
    console.log(`  Display Name : ${acc.display_name}`);
    console.log(`  Password     : ${acc.defaultPass}`);
    console.log(`  SHA-256 Hash : ${hash}\n`);
  }

  console.log("--------------------------------------------------------");
  console.log("📋 SQL STATEMENTS TO EXECUTE IN D1 CONSOLE:");
  console.log("--------------------------------------------------------\n");
  console.log(sqlStatements.join("\n"));
  console.log("\n--------------------------------------------------------");
  console.log("💡 You can also execute migration directly via wrangler:");
  console.log("   npx wrangler d1 execute meme-capsule-db --remote --file=d1/migrations/003_categorisation.sql");
  console.log("========================================================\n");
}

main().catch(console.error);
