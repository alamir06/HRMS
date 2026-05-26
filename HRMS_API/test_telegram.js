import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

async function testTelegram() {
  console.log("Testing telegram notification original codebase...");
  const { createTelegramNotifier } = await import('./src/Commons/CommonServices.js');
  const notifier = createTelegramNotifier();
  
  try {
    await notifier.notifyJobPosting({
      title: "Software Engineer",
      vacancies: 2,
      closingDate: "2026-12-31",
      description: "We are hiring!",
      requirements: "React, Node.js"
    });
    console.log("Finished test block.");
  } catch (error) {
    console.error("Test failed abruptly:", error);
  }
}

testTelegram();
