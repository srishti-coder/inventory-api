import fetch from "node-fetch";

export default async function handler(req, res) {
  const { gender, age } = req.query;

  const response = await fetch(
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRruBQB-x5T4oK9cWzM4JgAaMY64L06cLFxhObAC_AhzoV2-FXHWIPPU2EnBk6paBPxL5hr0ZlqTlR-/pub?gid=1640780709&single=true&output=csv"
  );
  const csvData = await response.text();
  const rows = csvData.split("\n").map(r => r.split(","));
  const data = rows.slice(1);

  const results = data.filter(row =>
    row[0].toLowerCase() === gender.toLowerCase() &&
    row[1].toLowerCase() === age.toLowerCase()
  );

  if (results.length === 0) {
    return res.status(200).send(`No designs available for ${gender} aged ${age}.`);
  }

  const designs = results.map(r => r[2]).join(", ");
  res.status(200).send(`Available designs for ${gender} aged ${age}: ${designs}.`);
}