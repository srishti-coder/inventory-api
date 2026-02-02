// api/createOrder.js

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ message: "Method not allowed" });
    }

    const { gender, age, design, quantity, customerName } = req.body;

    if (!gender || !age || !design || !quantity) {
      return res.status(400).json({
        success: false,
        message: "Missing order details"
      });
    }

    const orderId = "ORD-" + Date.now();

    const SHEET_WEBHOOK_URL = "https://docs.google.com/spreadsheets/d/1ktQ7AeuVQRtMNqO0_RLUCaOAaxeGKU5eCh2aqdlwRHs/export?format=csv&gid=1805316314";

    await fetch(SHEET_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId,
        customerName: customerName || "WhatsApp User",
        gender,
        age,
        design,
        quantity,
        status: "CONFIRMED",
        createdAt: new Date().toISOString()
      })
    });

    return res.json({
      success: true,
      message: "Order placed successfully",
      orderId
    });

  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create order"
    });
  }
}
