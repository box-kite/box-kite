/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
  /** Where the site posts its analytics batches; unset, it posts nothing. A repository variable, read by `pages.yml`. */
  readonly VITE_ANALYTICS_URL?: string;
  /** The Supabase project `/admin` signs in to and reads from, and its publishable key. Repository variables too. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
