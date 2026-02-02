// api/order.js
export default async function handler(req, res) {

  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    /*
      Expected body from MyOperator:

      {
        phone,
        design,
        quantity,
        price,
        name,
        address,
        city,
        pincode
      }
    */

    const {
      phone,
      design,
      quantity,
      price,
      name,
      address,
      city,
      pincode
    } = req.body;

    // Basic validation
    if (!phone || !design || !quantity || !name) {
      return res.status(400).json({
        success: false,
        message: "Missing required order fields"
      });
    }

    // 🔗 Google Apps Script Web App URL
    const GOOGLE_SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycbzg-bk7cc3zs9n06WTruwG2OGj0zdFkowDLjxKdIUhprNCjJJDoXBB7NIkAGiRT5PkChQ/exec";

    // Forward data to Google Apps Script
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        design,
        quantity,
        price,
        name,
        address,
        city,
        pincode
      })
    });

    const data = await response.json();

    return res.status(200).json({
      success: true,
      message: "Order placed successfully",
      data
    });

  } catch (error) {
    console.error("Order API error:", error);

    return res.status(500).json({
      success: false,
      message: "Order placement failed"
    });
  }
}

