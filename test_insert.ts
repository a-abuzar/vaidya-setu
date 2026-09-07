
import { neon } from '@neondatabase/serverless';
async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const res = await sql\insert into patients (full_name, date_of_birth, gender, phone, preferred_language, abha_linked) values ('Anonymous Kiosk Patient', '1900-01-01T00:00:00.000Z', 'other', 'anon-mtqs8um3', 'en', false) returning id\;
    console.log('Inserted:', res);
  } catch (err) {
    console.error('Error:', err);
  }
}
run();

