export default async function handler(req, res) {
  const { gender, age } = req.query;
  if (!gender || !age) {
    return res.status(400).json({ error: "gender and age are required" });
  }

  try {
    const SHEET_CSV =
      "https://docs.google.com/spreadsheets/d/1Q1CAOfaCQeNrYWkZ9XfSoz71N3P7fG-mfGrQ7zsiYiY/export?format=csv&gid=1640780709";

    const r = await fetch(SHEET_CSV, { cache: "no-store" });
    if (!r.ok) throw new Error(`CSV fetch failed: ${r.status}`);
    const csv = (await r.text()).replace(/\r/g, "").trim();

    // CSV -> rows (handles quoted commas)
    const lines = csv.split("\n");
    const splitCSV = (line) =>
      line
        .match(/("([^"]|"")*"|[^,])+/g) // groups respecting quotes
        .map(s => {
          let v = s.trim();
          if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/""/g, '"');
          return v;
        });

    const headers = splitCSV(lines[0]).map(h => h.replace(/^\uFEFF/, "").trim()); // strip BOM if any
    const rows = lines.slice(1).filter(Boolean).map(line => {
      const vals = splitCSV(line);
      const obj = {};
      headers.forEach((h, i) => (obj[h] = vals[i] ?? ""));
      return obj;
    });

    const normalize = v => String(v || "")
      .toLowerCase()
      .replace(/[\s–-]+/g, ""); // ignore spaces and dash types

    const matches = rows.filter(row =>
      normalize(row.Gender) === normalize(gender) &&
      normalize(row.Age) === normalize(age)
    );

    if (matches.length === 0) {
      return res.status(200).json({ message: `No designs available for ${gender} aged ${age}` });
    }

    const designs = matches.map(r => ({
      design: r.Design,
      quantity: Number(r.Quantity || 0)
    }));

    return res.status(200).json({
      gender,
      age,
      available_designs: designs
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch inventory data" });
  }
}

