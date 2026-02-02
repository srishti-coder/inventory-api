export default async function handler(req, res) {
  try {
    let { gender = "", age = "", design = "" } = req.query;

    /* ---------- HELPERS ---------- */

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

    /* ---------- AGE NORMALIZATION ---------- */

    let ageMatch = null;
    if (age) {
      ageMatch = age.match(/(\d+)\s*(?:to|[-–—])\s*(\d+)/i);
    }
    if (ageMatch) {
      age = `${ageMatch[1]}-${ageMatch[2]} years`;
    }

    /* ---------- FETCH INVENTORY ---------- */

    let csv = "";
    try {
      const response = await fetch(
        "https://docs.google.com/spreadsheets/d/1ktQ7AeuVQRtMNqO0_RLUCaOAaxeGKU5eCh2aqdlwRHs/export?format=csv&gid=1805316314"
      );
      csv = await response.text();
    } catch (err) {
      return res.json({
        message: "Sorry 😔 Inventory service is temporarily unavailable."
      });
    }

    /* ---------- PARSE CSV ---------- */

    const lines = csv
      .split("\n")
      .map((l) => l.replace("\r", "").trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return res.json({
        message: "Sorry 😔 Inventory data is empty."
      });
    }

    const headers = lines[0].split(",").map((h) => h.trim());

    const rows = lines.slice(1).map((line) => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((h, i) => (obj[h] = (values[i] ?? "").trim()));
      return obj;
    });

    /* ---------- FILTER AGE + GENDER ---------- */

    const filtered = rows.filter(
      (r) =>
        normalize(r.Gender) === normalize(gender) &&
        normalize(r.Age) === normalize(age)
    );

    if (!filtered.length) {
      return res.json({
        message: `Sorry 😔 No pieces available for ${gender} aged ${age}.`
      });
    }

    /* ---------- DESIGN FILTER ---------- */

    if (design) {
      const row = filtered.find(
        (r) => normalize(r.Design) === normalize(design)
      );

      if (!row) {
        return res.json({
          message: `Sorry 😔 Design ${design} is not available for ${gender} aged ${age}.`
        });
      }

      const qty = Number(row.Quantity) || 0;

      return res.json({
        message:
          qty > 0
            ? `Yes 😊 Design ${design} is available for ${gender} aged ${age}. Available quantity: ${qty} pieces.`
            : `Sorry 😔 Design ${design} is currently out of stock for ${gender} aged ${age}.`
      });
    }

    /* ---------- NO DESIGN ---------- */

    const totalQty = filtered.reduce(
      (sum, r) => sum + (Number(r.Quantity) || 0),
      0
    );

    return res.json({
      message:
        totalQty > 0
          ? `Yes 😊 ${gender} (${age}) designs are available. Total quantity: ${totalQty} pieces.`
          : `Sorry 😔 No stock available for ${gender} aged ${age}.`
    });
  } catch (err) {
    console.error(err);
    return res.json({
      message: "Unexpected server error 😔 Please try again later."
    });
  }
}



