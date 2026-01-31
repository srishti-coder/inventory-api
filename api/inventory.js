export default async function handler(req, res) {
  const { gender, age } = req.query;
  if (!gender || !age) return res.status(400).json({ error: "gender and age are required" });

  try {
    const response = await fetch("https://docs.google.com/spreadsheets/d/1Q1CAOfaCQeNrYWkZ9XfSoz71N3P7fG-mfGrQ7zsiYiY/export?format=csv&gid=1640780709");
    const csvText = await response.text();

    const lines = csvText.split("\n").map(l => l.replace("\r", "").trim()).filter(Boolean);
    const headers = lines[0].split(",").map(h => h.trim());
    const rows = lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim());
      const o = {}; headers.forEach((h, i) => { o[h] = values[i]; }); return o;
    });

    const normalize = v => String(v).toLowerCase().replace(/years?/g, "").replace(/[\s–-]+/g, "");
    const matches = rows.filter(r => normalize(r.Gender) === normalize(gender) && normalize(r.Age) === normalize(age));

    if (!matches.length) return res.status(200).json({ message: `No designs available for ${gender} aged ${age}` });

    const designs = matches.map(r => ({ design: r.Design, quantity: Number(r.Quantity) }));
    return res.status(200).json({ gender, age, available_designs: designs });
  } catch (e) {
    return res.status(500).json({ error: "Failed to fetch inventory data" });
  }
}


