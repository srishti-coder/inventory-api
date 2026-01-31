// api/inventory.js
// Node 18+ (Vercel)

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1ktQ7AeuVQRtMNqO0_RLUCaOAaxeGKU5eCh2aqdlwRHs/export?format=csv&gid=1805316314";

/* ---------------- HELPERS ---------------- */

function normalizeText(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAge(ageInput) {
  if (!ageInput) return null;
  const a = normalizeText(ageInput).replace(/\s/g, "");
  if (a.includes("2-4")) return "2-4";
  if (a.includes("4-6")) return "4-6";
  return null;
}

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

/**
 * 🔥 IMPORTANT FIX:
 * Headers are converted to lowercase
 * So Gender → gender, Age → age, Quantity → quantity
 */
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

/* ---------------- API ---------------- */

export default async function handler(req, res) {
  console.log(" INVENTORY API VERSION = v9-final");
  try {
    const { gender, age } = req.query;

    if (!gender || !age) {
      return res.status(400).json({
        available: false,
        message: "gender and age are required"
      });
    }

    const wantGender = normalizeText(gender);
    const wantAgeBand = normalizeAge(age);

    if (!wantAgeBand) {
      return res.json({ available: false, message: "Invalid age group" });
    }

    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("CSV fetch failed");

    const csvText = await response.text();
    const rows = parseCSV(csvText);

    // ✅ NOW THIS WILL WORK
    const matches = rows.filter(r => {
      const rowGender = normalizeText(r.gender);
      const rowAge = normalizeText(r.age);
      return rowGender === wantGender && rowAge.includes(wantAgeBand);
    });

    if (!matches.length) {
      return res.json({ available: false, message: "Not available" });
    }

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






