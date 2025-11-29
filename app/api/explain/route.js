import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Zoho sends form-data (NOT JSON)
    const form = await req.formData();

    const code = form.get("code");
    const language = form.get("language");

    if (!code || !language) {
      return NextResponse.json({
        explanation: "❌ Missing code or language.",
        raw: { code, language }
      });
    }

    const prompt = `Explain this ${language} code in simple steps:\n\n${code}`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4
        })
      }
    );

    const data = await response.json();

    // Extract explanation safely
    const explanation = data?.choices?.[0]?.message?.content;

    return NextResponse.json({
      explanation: explanation || "❌ No explanation returned.",
      raw: data
    });

  } catch (err) {
    return NextResponse.json(
      { explanation: "❌ Server Error: " + err.toString() },
      { status: 500 }
    );
  }
}
