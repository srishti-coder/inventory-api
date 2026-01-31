const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHF18mla3r-JyQm-Ec1Ex5V6lBNHntH3z5vNGpyPt-M2mm9nqzC-REgMV8gRsXLxM8HbmxJMY__7Xv/pub?output=csv"; // <- CSV, not pubhtml

function normalizeAge(ageInput) {
  if (!ageInput) return null;
  const age = String(ageInput).toLowerCase().replace(/\s/g, "");
  if (age.includes("2-4")) return "2-4 years";
  if (age.includes("4-6")) return "4-6 years";
  return null;
}

function parseCSV(csvText) {
  const lines = csvText.replace(/\r/g, "").trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim()); // ok if your sheet has no quoted commas
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ""; });
    return obj;
  });
}

export default async function handler(req, res) {
  try {
    const { gender, age } = req.query;
    if (!gender || !age) {
      return res.status(400).json({ available: false, message: "gender and age are required" });
    }

    const normalizedGender = String(gender).trim().toLowerCase();
    const normalizedAge = normalizeAge(age);
    if (!normalizedAge) return res.json({ available: false, message: "Invalid age group" });

    const response = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Fetch failed ${response.status}`);
    const csvText = await response.text();

    const inventory = parseCSV(csvText);

    const matches = inventory.filter(row => {
      const rowGender = String(row.Gender || "").toLowerCase().trim();
      const rowAge = String(row.Age || "").toLowerCase().trim();
      return rowGender === normalizedGender && rowAge === normalizedAge.toLowerCase();
    });

    if (matches.length === 0) return res.json({ available: false, message: "Not available" });

    const totalQuantity = matches.reduce((sum, r) => sum + (Number(r.Quantity?.trim() || 0) || 0), 0);
    return res.json({ available: totalQuantity > 0, quantity: totalQuantity });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ available: false, message: "Server error" });
  }
}




