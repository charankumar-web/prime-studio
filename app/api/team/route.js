import { NextResponse } from "next/server";

let teamFile = {
  content: `// Welcome to Collaborative Coding!\n`,
  language: "javascript",
  modifiedBy: null,
  modifiedAt: null,
};

export async function GET() {
  return NextResponse.json(teamFile);
}

export async function POST(req) {
  const body = await req.json();
  teamFile = {
    content: body.content,
    language: body.language,
    modifiedBy: body.modifiedBy,
    modifiedAt: Date.now(),
  };
  return NextResponse.json({ saved: true });
}

export async function DELETE() {
  teamFile = {
    content: `// Welcome to Collaborative Coding!\n`,
    language: "javascript",
    modifiedBy: null,
    modifiedAt: null,
  };
  return NextResponse.json({ deleted: true });
}
