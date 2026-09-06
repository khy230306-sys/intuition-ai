/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SSUK_ASSET_PROVIDER_API_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
