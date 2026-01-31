import fetch from "node-fetch";

// 🔴 MUST be published CSV (not normal sheet link)
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHF18mla3r-JyQm-Ec1Ex5V6lBNHntH3z5vNGpyPt-M2mm9nqzC-REgMV8gRsXLxM8HbmxJMY__7Xv/pub?output=csv";

// ---------- Normalize AGE ----------
function normalizeAge(ageInput) {
  if (!ageInput) return null;

  const age = ageInput.toLowerCase().replace(/\s/g, "");

  if (age.includes("2-4")) return "2-4 years";
  if (age.includes("4-6")) return "4-6 years";

  return null;
}

// ---------- Parse CSV Safely ----------
function parseCSV(csv) {
  const lines = csv.trim().split("\n");
  const headers = lines[0].split(",").map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim());
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i];
    });
    return obj;
  });
}

// ---------- API HANDLER ----------
export default async function handler(req, res) {
  try {
    const { gender, age, design } = req.query;

    if (!gender || !age) {
      return res.status(400).json({
        available: false,
        message: "gender and age are required"
      });
    }

    const normalizedGender = gender.trim().toLowerCase();
    const normalizedAge = normalizeAge(age);

    if (!normalizedAge) {
      return res.json({
        available: false,
        message: "Invalid age group"
      });
    }

    // Fetch CSV
    const response = await fetch(SHEET_CSV_URL);

    if (!response.ok) {
      throw new Error("Failed to fetch Google Sheet");
    }

    const csvText = await response.text();
    const inventory = parseCSV(csvText);

    // 🔍 MATCH DATA
    const matchedItems = inventory.filter(item => {
      return (
        item.Gender?.trim().toLowerCase() === normalizedGender &&
        item.Age?.trim().toLowerCase() === normalizedAge.toLowerCase() &&
        (!design || item.Design === design)
      );
    });

    if (matchedItems.length === 0) {
      return res.json({
        available: false,
        message: "Not available"
      });
    }

    const totalQuantity = matchedItems.reduce(
      (sum, item) => sum + Number(item.Quantity || 0),
      0
    );

    return res.json({
      available: true,
      quantity: totalQuantity,
      designs: matchedItems.map(i => i.Design)
    });

  } catch (error) {
    console.error("ERROR:", error.message);

    return res.status(500).json({
      available: false,
      message: "Server error"
    });
  }
}



