/// <reference types="vite/client" />

declare module '*.css';

interface ImportMetaEnv {
  /** Where the site posts its analytics batches; unset, it posts nothing. A repository variable, read by `pages.yml`. */
  readonly VITE_ANALYTICS_URL?: string;
}
