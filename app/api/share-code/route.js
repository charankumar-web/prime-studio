// app/api/share-code/route.js
import { NextResponse } from "next/server";

/**
 * Env var required:
 * ZOHO_SENDTOCHAT_URL = https://cliq.zoho.com/api/v2/bots/sendtochathandler/incoming?zapikey=XXXX
 */

const ZOHO_URL = process.env.ZOHO_SENDTOCHAT_URL;

/**
 * Escape triple backticks inside user code so it doesn't break markdown.
 * We insert a ZERO-WIDTH SPACE after the first backtick.
 */
function escapeBackticks(str = "") {
  return str.replace(/```/g, "`\u200b``");
}

export async function POST(req) {
  try {
    if (!ZOHO_URL) {
      return NextResponse.json(
        { success: false, error: "ZOHO_SENDTOCHAT_URL missing" },
        { status: 500 }
      );
    }

    let body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { type, code = "", language = "", output = "" } = body;

    let message = "";

    // --------------------------
    // MARKDOWN FORMATTING
    // --------------------------

    if (type === "code") {
      message =
        `📌 *Code Snippet (${language || "text"})*\n\n` +
        "```" + (language || "") + "\n" +
        escapeBackticks(code) +
        "\n```";

    } else if (type === "output") {
      message =
        `📤 *Output:*\n\n` +
        "```text\n" +
        escapeBackticks(output) +
        "\n```";

    } else if (type === "full") {
      message =
        `📌 *Code Snippet (${language})*\n\n` +
        "```" + language + "\n" +
        escapeBackticks(code) +
        "\n```\n\n" +
        `📤 *Output:*\n\n` +
        "```text\n" +
        escapeBackticks(output || "No output") +
        "\n```";

    } else {
      return NextResponse.json(
        { success: false, error: "Invalid type" },
        { status: 400 }
      );
    }

    // --------------------------
    // BASE64 SAFE ENCODING
    // --------------------------
    const encoded = Buffer.from(message, "utf8").toString("base64");

    // --------------------------
    // SEND TO ZOHO HANDLER
    // --------------------------
    const zohoRes = await fetch(ZOHO_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text_b64: encoded })
    });

    const raw = await zohoRes.text();

    if (!zohoRes.ok) {
      return NextResponse.json(
        { success: false, error: "Zoho handler error", details: raw },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, zohoReply: raw });

  } catch (err) {
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
