export const ROOT: string;
export const DESIGN_IDS: readonly string[];
export function designFonts(id: string): string[];
export function generatedFiles(): Promise<Record<string, string>>;
export function templateFiles(): {
  ts: { files: Record<string, string>; designs: Record<string, string> };
  js: { files: Record<string, string>; designs: Record<string, string> };
  fonts: Record<string, string[]>;
};
