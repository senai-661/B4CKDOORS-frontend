/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API do backend (ex.: http://localhost:3333) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
