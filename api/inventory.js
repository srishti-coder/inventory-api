export default async function handler(req, res) {
  let { gender, age, design } = req.query;

  // Normalize age
  if (age === "2-4") age = "2-4 years";
  if (age === "4-6") age = "4-6 years";

  const response = await fetch(
    "https://docs.google.com/spreadsheets/d/1Q1CAOfaCQeNrYWkZ9XfSoz71N3P7fG-mfGrQ7zsiYiY/export?format=csv&gid=1640780709"
  );

  const csv = await response.text();

  const lines = csv
    .split("\n")
    .map(l => l.replace("\r", "").trim())
    .filter(Boolean);

  const headers = lines[0].split(",");

  const rows = lines.slice(1).map(line => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => (obj[h] = values[i]));
    return obj;
  });

  const normalize = v =>
    String(v).toLowerCase().replace(/[\s-]+/g, "");

  // Step 1: filter by gender + age
  const ageGenderRows = rows.filter(
    r =>
      normalize(r.Gender) === normalize(gender) &&
      normalize(r.Age) === normalize(age)
  );

  if (ageGenderRows.length === 0) {
    return res.json({
      available: false,
      message: `No pieces available for ${gender} aged ${age}`
    });
  }

  // Step 2: if design asked, filter design
  if (design) {
    const designRow = ageGenderRows.find(
      r => normalize(r.Design) === normalize(design)
    );

    if (!designRow) {
      return res.json({
        available: false,
        message: `Design ${design} is not available for ${gender} aged ${age}`
      });
    }

    return res.json({
      available: true,
      quantity: Number(designRow.Quantity),
      designs: [designRow.Design]
    });
  }

  // Step 3: no design asked → return all designs
  return res.json({
    available: true,
    designs: ageGenderRows.map(r => r.Design),
    quantity: ageGenderRows.reduce(
      (sum, r) => sum + Number(r.Quantity),
      0
    )
  });
}

