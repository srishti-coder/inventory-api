Here’s a corrected, drop-in `api/inventory.js` that fixes the CSV URL, case-insensitive headers, robust age normalization, and safe quantity parsing:

```js
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHF18mla3r-JyQm-Ec1Ex5V6lBNHntH3z5vNGpyPt-M2mm9nqzC-REgMV8gRsXLxM8HbmxJMY__7Xv/pub?output=csv";

/* ------------------ HELPERS ------------------ */

// Normalize age input from query (handles variants like "2 - 4 yrs", "2–4 Years")
function normalizeAge(ageInput) {
  if (!ageInput) return null;
  const a = String(ageInput)
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  // Canonical groups used in the sheet
  if (/^2\s*-\s*4/.test(a)) return "2-4 years";
  if (/^4\s*-\s*6/.test(a)) return "4-6 years";
  return null;
}

// Normalize any free text for matching
function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

// Quote-safe CSV splitter
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

// Parse CSV into objects with lowercased headers for case-insensitive access
function parseCSV(csvText) {
  const lines = csvText.replace(/\r/g, "").trim().split("\n");
  const rawHeaders = splitCSV(lines[0]).map(h => h.trim());
  const headers = rawHeaders.map(h => h.toLowerCase());

  return lines.slice(1).map(line => {
    const values = splitCSV(line).map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  });
}

function toNumberSafe(val) {
  const n = Number(String(val ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
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
    const wantAge = normalizeAge(age);
    if (!wantAge) {
      return res.json({ available: false, message: "Invalid age group" });
    }
    const wantAgeN = normalizeText(wantAge);

    // Fetch CSV
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`CSV fetch failed: ${response.status}`);

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // Expect headers: "gender", "age", "quantity" (any case in sheet is OK)
    const inventory = rows.filter(r =>
      r.gender != null &&
      r.age != null &&
      String(r.quantity ?? "") !== "" &&
      !Number.isNaN(toNumberSafe(r.quantity))
    );

    // Match rows
    const matches = inventory.filter(r => {
      const rowGender = normalizeText(r.gender);
      const rowAge = normalizeText(r.age);
      return rowGender === wantGender && rowAge === wantAgeN;
    });

    if (matches.length === 0) {
      return res.json({ available: false, message: "Not available" });
    }

    // Sum quantity
    const quantity = matches.reduce((sum, r) => sum + toNumberSafe(r.quantity), 0);

    return res.json({ available: quantity > 0, quantity });
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({
      available: false,
      message: "Server error"
    });
  }
}
```




