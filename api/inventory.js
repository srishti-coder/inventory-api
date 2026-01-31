import fetch from "node-fetch";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRHF18mla3r-JyQm-Ec1Ex5V6lBNHntH3z5vNGpyPt-M2mm9nqzC-REgMV8gRsXLxM8HbmxJMY__7Xv/pub?output=csv";

// Normalize age input
function normalizeAge(ageInput) {
  if (!ageInput) return null;

  const age = ageInput.toLowerCase().replace(/\s/g, "");

  if (age.includes("2-4")) return "2-4 years";
  if (age.includes("4-6")) return "4-6 years";

  return null;
}

// Parse CSV safely
function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
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

export default async function handler(req, res) {
  try {
    const { gender, age } = req.query;

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
    const csvText = await response.text();

    // 🔍 DEBUG (remove later if you want)
    console.log("CSV SAMPLE:", csvText.slice(0, 100));

    const inventory = parseCSV(csvText);

    const matches = inventory.filter(item => {
      return (
        item.Gender?.toLowerCase().trim() === normalizedGender &&
        item.Age?.toLowerCase().trim() === normalizedAge
      );
    });

    if (matches.length === 0) {
      return res.json({
        available: false,
        message: "Not available"
      });
    }

    const totalQuantity = matches.reduce(
      (sum, item) => sum + Number(item.Quantity || 0),
      0
    );

    return res.json({
      available: true,
      quantity: totalQuantity
    });

  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({
      available: false,
      message: "Server error"
    });
  }
}




