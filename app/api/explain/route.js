import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    // Read form-data sent by Zoho Cliq
    const form = await req.formData();

    // Extract code + language
    const code = form.get("code");
    const language = form.get("language");

    // Validate input
    if (!code || !language) {
      return NextResponse.json({
        explanation: "❌ Missing code or language.",
        raw: { code, language }
      });
    }

    // Build AI prompt
    const prompt = `Explain this ${language} code in simple steps:\n\n${code}`;

    // Send request to Groq API
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

    // Read Groq response
    const data = await response.json();

    // Extract explanation text
    const explanation = data?.choices?.[0]?.message?.content;

    // Return result to Zoho
    return NextResponse.json({
      explanation: explanation || "❌ No explanation returned.",
      raw: data
    });

  } catch (err) {
    // Handle unexpected server errors
    return NextResponse.json(
      { explanation: "❌ Server Error: " + err.toString() },
      { status: 500 }
    );
  }
}
