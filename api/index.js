import fetch from "node-fetch";
import { parse } from "csv-parse/sync";

export default async function handler(req, res) {
  const { gender, age } = req.query;

  if (!gender || !age) {
    return res.status(400).json({ error: "gender and age are required" });
  }

  try {
    const response = await fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRruBQB-x5T4oK9cWzM4JgAaMY64L06cLFxhObAC_AhzoV2-FXHWIPPU2EnBk6paBPxL5hr0ZlqTlR-/pub?gid=1640780709&single=true&output=csv"
    );
    const csvText = await response.text();

    // Parse CSV safely using csv-parse
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    const normalize = v =>
      String(v).toLowerCase().replace(/[\s–-]+/g, "").replace(/years?/g, "");

    const matches = records.filter(
      row =>
        normalize(row.Gender) === normalize(gender) &&
        normalize(row.Age) === normalize(age)
    );

    if (matches.length === 0) {
      return res.status(200).json({
        message: `No designs available for ${gender} aged ${age}`
      });
    }

    const designs = matches.map(row => ({
      design: row.Design,
      quantity: Number(row.Quantity)
    }));

    return res.status(200).json({
      gender,
      age,
      available_designs: designs
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch inventory data" });
  }
}


