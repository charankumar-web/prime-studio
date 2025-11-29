import { NextResponse } from "next/server";

const ZOHO_HANDLER_URL =
  "https://cliq.zoho.com/api/v2/bots/sendtochathandler/incoming?zapikey=1001.050ce4fc4d8d63832f0467057ec12826.78a46d13f334cf2d8ed3559bf612be84";

export async function POST(req) {
  try {
    const { type, code, language, output } = await req.json();

    let message = "";

    if (type === "code") {
      message =
        "📌 *Code Snippet (" +
        language +
        ")*\n\n```" +
        language +
        "\n" +
        code +
        "\n```";
    }
    else if (type === "output") {
      message =
        "📤 *Output:*\n\n```text\n" +
        (output || "No output") +
        "\n```";
    }
    else if (type === "full") {
      message =
        "📌 *Code Snippet (" +
        language +
        ")*\n\n```" +
        language +
        "\n" +
        code +
        "\n```\n\n📤 *Output:*\n\n```text\n" +
        (output || "No output") +
        "\n```";
    }
    else {
      message = "Nothing to share.";
    }

    // Send POST to Zoho Bot Handler
    const zohoRes = await fetch(ZOHO_HANDLER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message })
    });

    const result = await zohoRes.text();
    return NextResponse.json({ success: true, zoho: result });

  } catch (err) {
    return NextResponse.json({ error: err.message });
  }
}
