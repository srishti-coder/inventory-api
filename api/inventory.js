

// api/inventory.js

// 1️⃣ Google Sheet CSV URL
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1ktQ7AeuVQRtMNq0Q_RLUca0AAxeGKU5eCh2agdlwRHs/export?format=csv";

/* ------------------ 2️⃣ Helper Functions ------------------ */

// Clean and normalize text
function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\u00A0/g, " ") // replace non-breaking spaces
    .replace(/[–—]/g, "-") // replace long dashes
    .replace(/\s+/g, " ") // collapse extra spaces
    .trim();
}

// Extract numeric age
function normalizeAge(ageInput) {
  if (!ageInput) return "";
  const age = String(ageInput).match(/\d+/);
  return age ? parseInt(age[0], 10) : "";
}

/* ------------------ 3️⃣ Main Function ------------------ */

async function getInventoryData() {
  // Fetch CSV data from Google Sheets
  const response = await fetch( "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHF18mla3r-JyQm-Ec1Ex5V6lBNHntH3z5vNGpyPt-M2mm9nqzC-REgMV8gRsXLxM8HbmxJMY__7Xw/pub?output=csv");
  const csvText = await response.text();

  // Split CSV into rows and columns
  const rows = csvText.split("\n").map((r) => r.split(","));
  const headers = rows[0].map((h) => normalizeText(h));

  // Convert rows into JSON objects
  const data = rows.slice(1).map((row) => {
    const item = {};
    headers.forEach((h, i) => {
      item[h] = normalizeText(row[i]);
    });
    return item;
  });

  return data;
}

/* ------------------ 4️⃣ API Handler for Vercel ------------------ */

export default async function handler(req, res) {
  try {
    const data = await getInventoryData();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}



