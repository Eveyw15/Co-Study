export async function askAiTutor(prompt: string, language: 'en' | 'cn'): Promise<string> {
  if (!prompt.trim()) return '';

  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, language }),
    });

    // ✅ 即使失败也尽量读出后端返回的 text，方便定位问题
    const data = (await res.json().catch(() => ({}))) as { text?: string };

    if (!res.ok) {
      return (
        data.text ||
        (language === 'cn' ? 'AI 服务暂时不可用。' : 'AI service is temporarily unavailable.')
      );
    }

    return data.text || (language === 'cn' ? '抱歉，我现在无法回答。' : 'Sorry, I cannot answer right now.');
  } catch (e) {
    console.error(e);
    return language === 'cn' ? 'AI 服务暂时不可用。' : 'AI service is temporarily unavailable.';
  }
}

