import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // 🟢 FIX: Cliq bot sends formData, not JSON
    const form = await req.formData();

    const code = form.get("code");
    const language = form.get("language");

    if (!code || !language) {
      return NextResponse.json(
        { explanation: "❌ Missing code or language in request." },
        { status: 400 }
      );
    }

    // Create prompt for OpenAI
    const prompt = `
Explain this ${language} code in simple, clear steps:

${code}
    `;

    // Call OpenAI
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    const data = await response.json();

    // Extract explanation
    const explanation =
      data?.choices?.[0]?.message?.content || "No explanation returned.";

    return NextResponse.json({ explanation });

  } catch (err) {
    return NextResponse.json(
      { explanation: "❌ Server Error: " + err.toString() },
      { status: 500 }
    );
  }
}
