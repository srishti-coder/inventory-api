import fetch from "node-fetch";

export default async function handler(req, res) {
  const { gender, age } = req.query;

  try {
    // Fetch data from Google Sheet (published as CSV)
    const response = await fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vRruBQB-x5T4oK9cWzM4JgAaMY64L06cLFxhObAC_AhzoV2-FXHWIPPU2EnBk6paBPxL5hr0ZlqTlR-/pub?gid=1640780709&single=true&output=csv"
    );
    const csvData = await response.text();

    // Split CSV into rows and columns
    const rows = csvData.split("\n").map(r => r.split(","));
    const data = rows.slice(1); // remove header row

    // Normalize text for flexible matching
    const normalize = str =>
      str.toLowerCase().replace(/[\s–-]+/g, ""); // removes spaces and dashes

    // Filter rows that match gender and age (case-insensitive, flexible)
    const results = data.filter(row =>
      normalize(row[0]).includes(normalize(gender)) &&
      normalize(row[1]).includes(normalize(age))
    );

    // If no matches found
    if (results.length === 0) {
      return res
        .status(200)
        .send(`No designs available for ${gender} aged ${age}.`);
    }

    // Extract designs and quantities
    const designs = results.map(r => `${r[2]} (Qty: ${r[3]})`).join(", ");

    // Send the response
    res
      .status(200)
      .send(`Available designs for ${gender} aged ${age}: ${designs}.`);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).send("Error fetching inventory data.");
  }
}