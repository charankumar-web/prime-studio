import { NextResponse } from "next/server";

const ZOHO_WEBHOOK_URL = process.env.ZOHO_SENDTOCHAT_URL;
  

export async function POST(req) {
  try {
    const { type, code, language, output } = await req.json();

    let textMessage = "";

    // FULL (Code + Output)
    if (type === "full") {
      textMessage =
        "📌 *Code Snippet (" + language + ")*\n\n" +
        "```" + language + "\n" + code + "\n```" +
        "\n\n📤 *Output:*\n```" + (output || "No output") + "```";
    }

    // ONLY CODE
    else if (type === "code") {
      textMessage =
        "📌 *Code (" + language + ")*\n\n```" +
        language + "\n" + code + "\n```";
    }

    // ONLY OUTPUT
    else if (type === "output") {
      textMessage =
        "📤 *Output:*\n\n```" +
        (output || "No output") + "```";
    }

    // FALLBACK
    else {
      textMessage = "Nothing to share.";
    }

    const payload = { text: textMessage };

    // SEND TO ZOHO
    const zohoRes = await fetch(ZOHO_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!zohoRes.ok) {
      const err = await zohoRes.text();
      return NextResponse.json({ error: "Zoho webhook error", details: err }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
