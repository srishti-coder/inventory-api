


const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/2PACX-1vRHF18mla3r-JyQm-Ec1Ex5V6lBNHntH3z5vNGpyPt-M2mm9nqzC-REgMV8gRsXLxM8HbmxJMY__7Xv/export?format=csv&gid=1805316314";

/* ------------------ HELPERS ------------------ */

// Normalize age input from query
function normalizeAge(ageInput) {
  if (!ageInput) return null;
  const a = String(ageInput)
    .toLowerCase()
    .replace(/\u00a0/g, " ")   // non-breaking space
    .replace(/–|—/g, "-")      // fancy hyphens
    .replace(/\s/g, "");

  if (a.includes("2-4")) return "2-4 years";
  if (a.includes("4-6")) return "4-6 years";
  return null;
}

// Normalize ANY text (CSV + input) safely
function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")   // NBSP
    .replace(/–|—/g, "-")      // long hyphens
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

// Parse CSV into objects
function parseCSV(csvText) {
  const lines = csvText.replace(/\r/g, "").trim().split("\n");
  const headers = splitCSV(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = splitCSV(line).map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
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

    // Fetch CSV
    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`CSV fetch failed: ${response.status}`);
    }

    const csvText = await response.text();

    // Parse + clean rows
    const inventory = parseCSV(csvText).filter(row =>
      row.Gender &&
      row.Age &&
      !isNaN(Number(String(row.Quantity).replace(/[^\d]/g, "")))
    );

    // Match rows
    const matches = inventory.filter(row => {
      const rowGender = normalizeText(row.Gender);
      const rowAge = normalizeText(row.Age);
      return rowGender === wantGender && rowAge === wantAge;
    });

    if (matches.length === 0) {
      return res.json({ available: false, message: "Not available" });
    }

    // Sum quantity
    const quantity = matches.reduce(
      (sum, r) => sum + Number(String(r.Quantity).replace(/[^\d]/g, "")),
      0
    );

    return res.json({
      available: quantity > 0,
      quantity
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({
      available: false,
      message: "Server error"
    });
  }
}




