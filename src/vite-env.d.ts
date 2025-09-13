/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BETA_HOLD?: string;
  readonly VITE_BETA_VIDEO_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}