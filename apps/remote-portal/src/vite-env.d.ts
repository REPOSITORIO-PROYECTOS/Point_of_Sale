/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REMOTE_API_URL?: string;
  readonly VITE_REMOTE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
