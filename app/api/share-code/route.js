import { NextResponse } from "next/server";

const ZOHO_WEBHOOK_URL =
  "https://cliq.zoho.com/api/v2/bots/sendtochathandler/incoming?zapikey=1001.050ce4fc4d8d63832f0467057ec12826.78a46d13f334cf2d8ed3559bf612be84";

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
