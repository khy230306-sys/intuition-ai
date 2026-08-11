/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module 'mammoth' {
  export function extractRawText(input: {
    arrayBuffer: ArrayBuffer
  }): Promise<{ value: string }>
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string
  export default url
}
