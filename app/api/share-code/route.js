// app/api/share-code/route.js
import { NextResponse } from "next/server";

/**
 * Environment:
 * - Set ZOHO_SENDTOCHAT_URL in Vercel: 
 *   e.g. https://cliq.zoho.com/api/v2/bots/sendtochathandler/incoming?zapikey=YOUR_ZAPIKEY
 *
 * Behavior:
 * - Accepts JSON body { type, code, language, output }
 * - Sends a text payload with triple-backtick code block (markdown) to the zoho handler
 * - Truncates long messages to avoid Zoho 5000-char limit
 */

const ZOHO_URL = process.env.ZOHO_SENDTOCHAT_URL;

function safeForBackticks(s) {
  if (!s) return "";
  // Replace any triple-backticks inside user code to avoid breaking the code block
  // Insert a ZERO-WIDTH SPACE after the first backtick to break the exact triple sequence
  return s.replace(/```/g, "`\u200b``");
}

export async function POST(req) {
  try {
    if (!ZOHO_URL) {
      return NextResponse.json(
        { success: false, error: "Server not configured: ZOHO_SENDTOCHAT_URL missing" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { type, code = "", language = "", output = "" } = body;

    // Build markdown message
    let message = "";

    if (type === "code") {
      message =
        `📌 *Code Snippet (${language || "text"})*\n\n` +
        "```" + (language || "") + "\n" +
        safeForBackticks(String(code)) +
        "\n```";
    } else if (type === "output") {
      message =
        `📤 *Output:*\n\n` +
        "```text\n" +
        safeForBackticks(String(output)) +
        "\n```";
    } else if (type === "full") {
      message =
        `📌 *Code Snippet (${language || "text"})*\n\n` +
        "```" + (language || "") + "\n" +
        safeForBackticks(String(code)) +
        "\n```\n\n" +
        `📤 *Output:*\n\n` +
        "```text\n" +
        safeForBackticks(String(output || "No output")) +
        "\n```";
    } else {
      return NextResponse.json({ success: false, error: "Invalid type" }, { status: 400 });
    }

    // Zoho text limit ~5000. Reserve room for wrapper text and safety.
    const MAX_TEXT = 4800;
    if (message.length > MAX_TEXT) {
      message = message.slice(0, MAX_TEXT - 16) + "\n\n...(truncated)";
    }

    // Prepare payload for the handler (handler expects { text: "..." })
    const payload = { text: message };

    const zohoRes = await fetch(ZOHO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const respText = await zohoRes.text();

    if (!zohoRes.ok) {
      return NextResponse.json(
        { success: false, error: "Zoho handler error", details: respText },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, zohoResponse: respText });
  } catch (err) {
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}
