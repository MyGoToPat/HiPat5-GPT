export type TemplateContext = Record<string, any>;

export function renderTemplate(input: string, ctx: TemplateContext): string {
  return input.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let v: any = ctx;
    for (const p of parts) v = v?.[p];
    return (v ?? "").toString();
  });
}