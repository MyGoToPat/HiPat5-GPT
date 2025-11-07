// Post-processors for personality formatting

export interface AnswerFirstPayload {
  text: string;
  source?: string;
  nextStep?: string;
}

export function formatAnswerFirst(payload: AnswerFirstPayload): string {
  const lines: string[] = [];

  if (payload.text) {
    lines.push(payload.text);
  }

  if (payload.source) {
    // Single clean link label
    lines.push(`Source: ${payload.source}`);
  }

  if (payload.nextStep) {
    lines.push(`Next: ${payload.nextStep}`);
  }

  return lines.join("\n\n");
}
