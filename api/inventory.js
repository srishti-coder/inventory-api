export default async function handler(req, res) {
  try {
    let { gender = "", age = "", design = "" } = req.query;

    /* -------------------- HELPERS -------------------- */

    // Clean incoming values (WA often sends weird chars)
    const clean = (v) =>
      String(v ?? "")
        .trim()
        .replace(/\+/g, " ")
        .normalize("NFKC");

    const normalize = (v) =>
      String(v ?? "")
        .toLowerCase()
        .replace(/[\u00A0\u2000-\u200B]/g, " ")
        .replace(/[\u2010-\u2015\u2212]/g, "-")
        .replace(/[\s_-]+/g, "")
        .replace(/[^a-z0-9]/g, "");

    gender = clean(gender);
    age = clean(age);
    design = clean(design);

    /* -------------------- AGE NORMALIZATION -------------------- */

    // Accept: "2-4", "2–4", "2 to 4", "2 - 4"
 let ageMatch = null;

if (typeof age === "string" && age.trim() !== "") {
  ageMatch = age.match(/(\d+)\s*(?:to|[-–—])\s*(\d+)/i);
}

if (ageMatch) {
  age = `${ageMatch[1]}-${ageMatch[2]} years`;
}


    /* -------------------- FETCH INVENTORY -------------------- */

/* -------------------- FETCH INVENTORY -------------------- */

let csv = "";

try {
  const response = await fetch(
    "https://docs.google.com/spreadsheets/d/1ktQ7AeuVQRtMNqO0_RLUCaOAaxeGKU5eCh2aqdlwRHs/export?format=csv&gid=1805316314"
  );

  csv = await response.text();
} catch (err) {
  console.error("CSV Fetch Error:", err);
  return res.status(500).json({
    available: false,
    message: "Inventory service temporarily unavailable"
  });
}


    /* -------------------- PARSE CSV -------------------- */

    const lines = csv
      .split("\n")
      .map((l) => l.replace("\r", "").trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return res.json({
        available: false,
        message: "Inventory data is empty"
      });
    }

    const headers = lines[0].split(",").map((h) => h.trim());

    const rows = lines.slice(1).map((line) => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((h, i) => (obj[h] = (values[i] ?? "").trim()));
      return obj;
    });

    /* -------------------- FILTER BY AGE + GENDER -------------------- */

    const ageGenderRows = rows.filter(
      (r) =>
        normalize(r.Gender) === normalize(gender) &&
        normalize(r.Age) === normalize(age)
    );

    if (ageGenderRows.length === 0) {
      return res.json({
        available: false,
        message: `No pieces available for ${gender} aged ${age}`
      });
    }

    /* -------------------- DESIGN FILTER (OPTIONAL) -------------------- */

    if (design) {
      const designRow = ageGenderRows.find(
        (r) => normalize(r.Design) === normalize(design)
      );

      if (!designRow) {
        return res.json({
          available: false,
          message: `Design ${design} is not available for ${gender} aged ${age}`
        });
      }

      return res.json({
        available: true,
        quantity: Number(designRow.Quantity) || 0,
        designs: [designRow.Design]
      });
    }

    /* -------------------- NO DESIGN → RETURN ALL -------------------- */

    return res.json({
      available: true,
      designs: ageGenderRows.map((r) => r.Design),
      quantity: ageGenderRows.reduce(
        (sum, r) => sum + (Number(r.Quantity) || 0),
        0
      )
    });
  } catch (err) {
    console.error("Inventory API Error:", err);
    return res.status(500).json({
      available: false,
      message: "Unexpected server error"
    });
  }
}

