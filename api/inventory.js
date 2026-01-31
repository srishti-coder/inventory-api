// api/inventory.js
// Works on Vercel (Node 18+)

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1ktQ7AeuVQRtMNqO0_RLUCaOAaxeGKU5eCh2aqdlwRHs/export?format=csv&gid=1805316314";

/* ------------------ HELPERS ------------------ */

// normalize any text (CSV + query)
function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")   // non-breaking space
    .replace(/[–—]/g, "-")    // fancy hyphens
    .replace(/\s+/g, " ")
    .trim();
}

// normalize age input
function normalizeAge(ageInput) {
  if (!ageInput) return null;
  const a = normalizeText(ageInput).replace(/\s/g, "");
  if (a.includes("2-4")) return "2-4 years";
  if (a.includes("4-6")) return "4-6 years";
  return null;
}

// quote-safe CSV split
function splitCSV(line) {
  const out = [];
  let cur = "", inQ = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i], n = line[i + 1];
    if (c === '"' && n === '"') { cur += '"'; i++; continue; }
    if (c === '"') { inQ = !inQ; continue; }
    if (c === "," && !inQ) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

// parse CSV → array of objects (case-insensitive headers)
function parseCSV(csvText) {
  const lines = csvText.replace(/\r/g, "").trim().split("\n");
  const headers = splitCSV(lines[0]).map(h => h.toLowerCase().trim());

  return lines.slice(1).map(line => {
    const values = splitCSV(line).map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] ?? "");
    return obj;
  });
}

/* ------------------ API ------------------ */

export default async function handler(req, res) {
  try {
    const { gender, age } = req.query;

    if (!gender || !age) {
      return res.status(400).json({
        available: false,
        message: "gender and age are required"
      });
    }

    const wantGender = normalizeText(gender);
    const wantAge = normalizeText(normalizeAge(age));

    if (!wantAge) {
      return res.json({ available: false, message: "Invalid age group" });
    }

    // fetch CSV
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`CSV fetch failed: ${response.status}`);
    }

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // match rows
    const matches = rows.filter(r =>
      normalizeText(r.gender) === wantGender &&
      normalizeText(r.age) === wantAge
    );

    if (!matches.length) {
      return res.json({ available: false, message: "Not available" });
    }

    // sum quantity
    const quantity = matches.reduce(
      (sum, r) => sum + Number(String(r.quantity).replace(/[^\d]/g, "")),
      0
    );

    return res.json({
      available: quantity > 0,
      quantity
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      available: false,
      message: "Server error"
    });
  }
}





