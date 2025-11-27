import { NextResponse } from "next/server";

// Replace these values (DO NOT EXPOSE PUBLICLY)
const ZOHO_WEBHOOK_URL =
  "https://cliq.zoho.com/api/v2/bots/sendtochathandler/incoming?zapikey=1001.050ce4fc4d8d63832f0467057ec12826.78a46d13f334cf2d8ed3559bf612be84";

export async function POST(req) {
  try {
    const { code, language, output } = await req.json();

    if (!code || !language) {
      return NextResponse.json(
        { error: "Missing code/language" },
        { status: 400 }
      );
    }

    // Card content sent to Zoho bot
    const payload = {
      text: "incoming_code_snippet",
      card: {
        theme: "modern",
        title: `Code Snippet (${language})`,
        subtitle: "Shared from Prime Studio Editor",
        components: [
          {
            type: "text",
            text: "```" + language + "\n" + code + "\n```"
          },
          {
            type: "button",
            label: "Show Output",
            name: "show_output",
            id: "show_output",
            value: output // send pre-generated output
          }
        ]
      }
    };

    const zohoRes = await fetch(ZOHO_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!zohoRes.ok) {
      return NextResponse.json(
        { error: "Zoho webhook error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err.message ?? String(err) },
      { status: 500 }
    );
  }
}
