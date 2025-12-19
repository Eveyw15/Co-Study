export async function askAiTutor(prompt: string, language: 'en' | 'cn'): Promise<string> {
  if (!prompt.trim()) return '';

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, language }),
    });

    if (!res.ok) {
      const msg = language === 'cn' ? 'AI 服务暂时不可用。' : 'AI service is temporarily unavailable.';
      return msg;
    }

    const data = (await res.json()) as { text?: string };
    return data.text || (language === 'cn' ? '抱歉，我现在无法回答。' : 'Sorry, I cannot answer right now.');
  } catch (e) {
    console.error(e);
    return language === 'cn' ? 'AI 服务暂时不可用。' : 'AI service is temporarily unavailable.';
  }
}
