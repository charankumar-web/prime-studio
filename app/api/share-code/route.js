import { NextResponse } from "next/server";

// Zoho incoming webhook URL
const ZOHO_WEBHOOK_URL = process.env.ZOHO_SENDTOCHAT_URL;

export async function POST(req) {
  try {
    // Read incoming JSON payload
    const { type, code, language, output } = await req.json();

    // Message builder
    let textMessage = "";

    // Build message for "full" → code + output
    if (type === "full") {
      textMessage =
        "📌 *Code Snippet (" + language + ")*\n\n" +
        "```" + language + "\n" + code + "\n```" +
        "\n\n📤 *Output:*\n```" + (output || "No output") + "```";
    }

    // Build message for only code
    else if (type === "code") {
      textMessage =
        "📌 *Code (" + language + ")*\n\n```" +
        language + "\n" + code + "\n```";
    }

    // Build message for only output
    else if (type === "output") {
      textMessage =
        "📤 *Output:*\n\n```" +
        (output || "No output") + "```";
    }

    // Default fallback
    else {
      textMessage = "Nothing to share.";
    }

    // Zoho message payload
    const payload = { text: textMessage };

    // Send message to Zoho incoming webhook
    const zohoRes = await fetch(ZOHO_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    // Handle Zoho errors
    if (!zohoRes.ok) {
      const err = await zohoRes.text();
      return NextResponse.json(
        { error: "Zoho webhook error", details: err },
        { status: 500 }
      );
    }

    // Success response
    return NextResponse.json({ success: true });

  } catch (err) {
    // Handle server or runtime errors
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
