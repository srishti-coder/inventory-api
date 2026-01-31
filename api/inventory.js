import fetch from "node-fetch";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/YOUR_SHEET_ID/pub?output=csv";

// ---------- Utility: Normalize Age ----------
function normalizeAge(ageInput) {
  if (!ageInput) return null;

  const age = ageInput.toLowerCase().trim();

  if (age.includes("2-4")) return "2-4 years";
  if (age.includes("4-6")) return "4-6 years";

  return null;
}

// ---------- Utility: Parse CSV ----------
function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i];
    });
    return row;
  });
}

// ---------- API Handler ----------
export default async function handler(req, res) {
  try {
    const { gender, age, design } = req.query;

    if (!gender || !age) {
      return res.status(400).json({
        error: "gender and age are required"
      });
    }

    // Normalize inputs
    const normalizedGender = gender.toLowerCase().trim();
    const normalizedAge = normalizeAge(age);

    if (!normalizedAge) {
      return res.json({
        available: false,
        message: "Invalid age group"
      });
    }

    // Fetch CSV
    const response = await fetch(SHEET_CSV_URL);
    const csvText = await response.text();
    const inventory = parseCSV(csvText);

    // Find matching rows
    const matches = inventory.filter(item => {
      return (
        item.Gender.toLowerCase() === normalizedGender &&
        item.Age.toLowerCase() === normalizedAge.toLowerCase() &&
        (!design || item.Design === design)
      );
    });

    if (matches.length === 0) {
      return res.json({
        available: false,
        message: "Not available"
      });
    }

    // Sum quantity (safe)
    const totalQuantity = matches.reduce(
      (sum, item) => sum + Number(item.Quantity || 0),
      0
    );

    return res.json({
      available: true,
      quantity: totalQuantity,
      designs: matches.map(item => item.Design)
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      error: "Internal server error"
    });
  }
}




