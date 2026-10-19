export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

/** The manager that ran `create`, read off the user agent every one of them sets (`pnpm/9.12.0 npm/? node/v22…`). */
export function detectPackageManager(userAgent: string | undefined): PackageManager {
  const name = userAgent?.split(' ')[0]?.split('/')[0];
  return name === 'pnpm' || name === 'yarn' || name === 'bun' ? name : 'npm';
}

/** How the reader starts the dev server with it: `npm run dev`, `pnpm dev`. */
export const runCommand = (manager: PackageManager, script: string) =>
  manager === 'npm' || manager === 'bun' ? `${manager} run ${script}` : `${manager} ${script}`;
