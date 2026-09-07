import { db } from "./lib/db";
import { patients } from "./lib/db/schema";
async function main() {
  try {
    const inserted = await db.insert(patients).values({
      full_name: "Anonymous Kiosk Patient",
      date_of_birth: new Date("1900-01-01"),
      gender: "other",
      phone: "anon-" + Date.now().toString(36),
      preferred_language: "en",
      abha_linked: false,
    }).returning();
    console.log("Success:", inserted);
  } catch (err) {
    console.error(err);
  }
}
main();
