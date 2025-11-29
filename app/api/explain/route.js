import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Zoho Cliq sends form-data, NOT JSON
    const form = await req.formData();

    const code = form.get("code");
    const language = form.get("language");

    if (!code || !language) {
      return NextResponse.json(
        { explanation: "❌ Missing code or language." },
        { status: 400 }
      );
    }

    const prompt = `
Explain this ${language} code in simple steps:

${code}
`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        })
      }
    );

    const data = await response.json();

    const explanation =
      data?.choices?.[0]?.message?.content ||
      "No explanation returned.";

    return NextResponse.json({ explanation });

  } catch (err) {
    return NextResponse.json(
      { explanation: "❌ Server error: " + err.toString() },
      { status: 500 }
    );
  }
}
