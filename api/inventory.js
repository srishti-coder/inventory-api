// api/inventory.js
// Node 18+ (Vercel)

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1ktQ7AeuVQRtMNq0Q_RLUca0AAxeGKU5eCh2agdlwRHs/export?format=csv";

/* ------------------ HELPERS ------------------ */

function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\u00A0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAge(ageInput) {
  if (!ageInput) return "";
  const age = String(ageInput).match(/\d+/);
  return age ? parseInt(age[0], 10) : "";
}

/* ------------------ MAIN FUNCTION ------------------ */

async function getInventoryData() {
  const response = await fetch(SHEET_CSV_URL);
  const csvText = await response.text();

  const rows = csvText.split("\n").map((r) => r.split(","));
  const headers = rows[0].map((h) => normalizeText(h));
  const data = rows.slice(1).map((row) => {
    const item = {};
    headers.forEach((h, i) => {
      item[h] = normalizeText(row[i]);
    });
    return item;
  });

  return data;
}

/* ------------------ API HANDLER ------------------ */

export default async function handler(req, res) {
  try {
    const data = await getInventoryData();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}





