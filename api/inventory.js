export default async function handler(req, res) {
  try {
    let { gender, age, design } = req.query;

    // ------------------------------
    // 1️⃣ BASIC VALIDATION
    // ------------------------------
    if (!gender || !age) {
      return res.status(200).json({
        available: false,
        message: "Gender or age missing"
      });
    }

    // ------------------------------
    // 2️⃣ NORMALIZE INPUTS
    // ------------------------------
    gender = gender.trim().toLowerCase();

    age = age.trim();
    if (age === "2-4") age = "2-4 years";
    if (age === "4-6") age = "4-6 years";

    if (design) {
      design = design.trim().toUpperCase();
    }

    // ------------------------------
    // 3️⃣ FETCH GOOGLE SHEET (CSV)
    // ------------------------------
    const sheetUrl =
      "https://docs.google.com/spreadsheets/d/1ktQ7AeuVQRtMNqO0_RLUCaOAaxeGKUseCh2aqdlwRHs/export?format=csv";

    const response = await fetch(sheetUrl);
    const csvText = await response.text();

    // ------------------------------
    // 4️⃣ PARSE CSV SAFELY
    // ------------------------------
    const lines = csvText
      .split("\n")
      .map(l => l.replace("\r", "").trim())
      .filter(Boolean);

    const headers = lines[0].split(",").map(h => h.trim());

    const rows = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = values[i];
      });
      return obj;
    });

    // ------------------------------
    // 5️⃣ FILTER BY GENDER + AGE
    // ------------------------------
    const filtered = rows.filter(r =>
      r.Gender.toLowerCase() === gender &&
      r.Age === age
    );

    if (filtered.length === 0) {
      return res.status(200).json({
        available: false,
        message: `No pieces available for ${gender} aged ${age}`
      });
    }

    // ------------------------------
    // 6️⃣ IF DESIGN ASKED → CHECK IT
    // ------------------------------
    if (design) {
      const designRow = filtered.find(
        r => r.Design.toUpperCase() === design
      );

      if (!designRow || Number(designRow.Quantity) === 0) {
        return res.status(200).json({
          available: false,
          message: `Design ${design} is not available for ${gender} aged ${age}`
        });
      }

      return res.status(200).json({
        available: true,
        quantity: Number(designRow.Quantity),
        designs: [design]
      });
    }

    // ------------------------------
    // 7️⃣ IF NO DESIGN ASKED → RETURN ALL
    // ------------------------------
    const designs = filtered
      .filter(r => Number(r.Quantity) > 0)
      .map(r => r.Design);

    return res.status(200).json({
      available: designs.length > 0,
      quantity: designs.length > 0 ? Number(filtered[0].Quantity) : 0,
      designs
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      available: false,
      message: "Internal server error"
    });
  }
}
