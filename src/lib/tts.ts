// src/lib/tts.ts
import { getSupabase } from './supabase'; // Assuming getSupabase is available for auth token

export async function speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
  if (!text) return;

  try {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const jwt = session?.access_token;

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`, // Pass JWT for authentication
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error('OpenAI TTS API error:', response.status, await response.text());
      // Fallback to browser TTS if OpenAI fails
      console.warn('Falling back to browser speechSynthesis.');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate || 1.0;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 1.0;
      window.speechSynthesis.speak(utterance);
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();

    // Clean up the object URL after the audio has played
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };

  } catch (error) {
    console.error('Error playing OpenAI TTS:', error);
    // Fallback to browser TTS if network or other error
    console.warn('Falling back to browser speechSynthesis.');
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate || 1.0;
    utterance.pitch = options?.pitch || 1.0;
    utterance.volume = options?.volume || 1.0;
    window.speechSynthesis.speak(utterance);
  }
}