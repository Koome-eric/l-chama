
const fs = require("fs");
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const logPath =
  "C:\\Users\\HomePC\\migration-tool\\logs\\migration-2026-10-28T12-35-47.log";

const expectedMissingOldIds = new Set([
  "user_3J7CT153SRksZJD5DzbN0DhkMdv",
  "user_3L30c0MPP9Hdsx155KcLZDv7X6Q",
  "user_3LA5UJbdbFBEqVH1k41Csk5rdL3",
]);

const applyChanges = process.argv.includes("--apply");

function loadMappings() {
  const content = fs.readFileSync(logPath, "utf8");
  const mappings = [];

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/\{.*\}/);
    if (!match) continue;

    try {
      const entry = JSON.parse(match[0]);

      if (
        entry.status === "success" &&
        typeof entry.userId === "string" &&
        typeof entry.clerkUserId === "string"
      ) {
        mappings.push({
          oldId: entry.userId,
          newId: entry.clerkUserId,
        });
      }
    } catch {
      // Ignore log lines that are not valid JSON records.
    }
  }

  return mappings;
}

async function main() {
  const mappings = loadMappings();

  if (mappings.length !== 44) {
    throw new Error(
      `Expected 44 successful mappings; found ${mappings.length}.`
    );
  }

  const oldIds = mappings.map((m) => m.oldId);
  const newIds = mappings.map((m) => m.newId);

  if (
    new Set(oldIds).size !== 44 ||
    new Set(newIds).size !== 44
  ) {
    throw new Error("Duplicate old or new Clerk IDs found.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const oldPlaceholders = oldIds.map((_, i) => `$${i + 1}`).join(",");
    const existing = await tx.$queryRawUnsafe(
      `SELECT id, "clerkId" FROM "user"
       WHERE "clerkId" IN (${oldPlaceholders})`,
      ...oldIds
    );

    const newPlaceholders = newIds.map((_, i) => `$${i + 1}`).join(",");
    const collisions = await tx.$queryRawUnsafe(
      `SELECT id, "clerkId" FROM "user"
       WHERE "clerkId" IN (${newPlaceholders})`,
      ...newIds
    );

    const foundOldIds = new Set(existing.map((row) => row.clerkId));
    const missing = mappings.filter((m) => !foundOldIds.has(m.oldId));
    const actualMissingIds = new Set(missing.map((m) => m.oldId));

    if (existing.length !== 41 || missing.length !== 3) {
      throw new Error(
        `Unexpected database match count: found ${existing.length} old IDs and ${missing.length} missing. No changes made.`
      );
    }

    if (
      [...expectedMissingOldIds].some((id) => !actualMissingIds.has(id)) ||
      [...actualMissingIds].some((id) => !expectedMissingOldIds.has(id))
    ) {
      throw new Error(
        "The unmatched IDs differ from the previously checked three. No changes made."
      );
    }

    if (collisions.length !== 0) {
      throw new Error(
        `Found ${collisions.length} rows already using a new Clerk ID. No changes made.`
      );
    }

    console.log("Successful migration mappings:", mappings.length);
    console.log("Existing users matched:", existing.length);
    console.log("Unmatched users left untouched:", missing.length);
    console.log("New-ID collisions:", collisions.length);

    for (const m of missing) {
      console.log(`Unmatched: ${m.oldId} -> ${m.newId}`);
    }

    if (!applyChanges) {
      console.log("\nDRY RUN ONLY: no database records were changed.");
      console.log("Review the results before running with --apply.");
      return { updated: 0, dryRun: true };
    }

    let updatedCount = 0;

    for (const mapping of mappings) {
      if (!foundOldIds.has(mapping.oldId)) continue;

      const updated = await tx.$queryRaw`
        UPDATE "user"
        SET "clerkId" = ${mapping.newId}
        WHERE "clerkId" = ${mapping.oldId}
        RETURNING id
      `;

      if (updated.length !== 1) {
        throw new Error(
          `Expected exactly one updated row for ${mapping.oldId}; got ${updated.length}. Transaction will roll back.`
        );
      }

      updatedCount++;
    }

    if (updatedCount !== 41) {
      throw new Error(
        `Expected to update 41 users; updated ${updatedCount}. Transaction will roll back.`
      );
    }

    const finalRows = await tx.$queryRawUnsafe(
      `SELECT id, "clerkId" FROM "user"
       WHERE "clerkId" IN (${newPlaceholders})`,
      ...newIds
    );

    if (finalRows.length !== 41) {
      throw new Error(
        `Post-update verification failed: found ${finalRows.length} new IDs, expected 41. Transaction will roll back.`
      );
    }

    console.log("\nVerified updated rows inside transaction:", finalRows.length);

    return { updated: updatedCount, dryRun: false };
  }, {
    maxWait: 10000,
    timeout: 60000,
  });

  if (result.dryRun) return;

  console.log("\nSUCCESS: Clerk IDs updated:", result.updated);
  console.log("Internal user IDs and related records were not changed.");
}

main()
  .catch((error) => {
    console.error("\nSTOP:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
