// Node 18+ has global fetch (no need node-fetch)

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHF18mla3r-JyQm-Ec1Ex5V6lBNHntH3z5vNGpyPt-M2mm9nqzC-REgMV8gRsXLxM8HbmxJMY__7Xv/pub?gid=1805316314&single=true&output=csv";

// Normalize age
function normalizeAge(ageInput) {
  if (!ageInput) return null;
  const age = String(ageInput).toLowerCase().replace(/\s/g, "");
  if (age.includes("2-4")) return "2-4 years";
  if (age.includes("4-6")) return "4-6 years";
  return null;
}

// CSV parser (quote-safe)
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

function parseCSV(csvText) {
  const lines = csvText.replace(/\r/g, "").trim().split("\n");
  const headers = splitCSV(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = splitCSV(line).map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = values[i] ?? "");
    return obj;
  });
}

export default async function handler(req, res) {
  try {
    const { gender, age } = req.query;

    if (!gender || !age) {
      return res.status(400).json({
        available: false,
        message: "gender and age are required"
      });
    }

    const normalizedGender = String(gender).toLowerCase().trim();
    const normalizedAge = normalizeAge(age);
    if (!normalizedAge) {
      return res.json({ available: false, message: "Invalid age group" });
    }

    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    const csvText = await response.text();

    const inventory = parseCSV(csvText);

    const matches = inventory.filter(row => {
      const rowGender = String(row.Gender || "").toLowerCase().trim();
      const rowAge = String(row.Age || "").toLowerCase().trim();
      return rowGender === normalizedGender && rowAge === normalizedAge;
    });

    if (matches.length === 0) {
      return res.json({ available: false, message: "Not available" });
    }

    const quantity = matches.reduce(
      (sum, r) => sum + Number(r.Quantity || 0),
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




