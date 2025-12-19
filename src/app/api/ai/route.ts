import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';

type Body = {
  prompt?: string;
  language?: 'en' | 'cn';
};

function systemInstruction(language: 'en' | 'cn') {
  return language === 'cn'
    ? '你是一个友善、知识渊博的AI学习助教。请用简洁、鼓励的语气回答学生的学术问题。如果用户在闲聊，请礼貌地引导他们回到学习上。'
    : 'You are a friendly, knowledgeable AI study tutor. Answer academic questions concisely and encouragingly. If the user chats about non-study topics, politely guide them back to studying.';
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { text: 'Server is missing GEMINI_API_KEY.' },
      { status: 500 }
    );
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ text: 'Invalid JSON.' }, { status: 400 });
  }

  const prompt = String(body.prompt || '').trim();
  const language = body.language === 'en' ? 'en' : 'cn';

  if (!prompt) {
    return NextResponse.json({ text: '' }, { status: 200 });
  }
  if (prompt.length > 6000) {
    return NextResponse.json({ text: 'Prompt is too long.' }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    // You can override this with an env var if Google changes naming.
    const model = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction(language),
      },
    });

    const text = response.text || (language === 'cn' ? '抱歉，我现在无法回答。' : 'Sorry, I cannot answer right now.');
    return NextResponse.json({ text });
  } catch (e) {
    console.error('Gemini API error:', e);
    return NextResponse.json(
      { text: language === 'cn' ? 'AI 服务暂时不可用。' : 'AI service is temporarily unavailable.' },
      { status: 502 }
    );
  }
}
