/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

/**
 * Public build-time variables.
 *
 * Declared explicitly so `import.meta.env.PUBLIC_ANALYTICS_ID` type-checks.
 * Astro exposes PUBLIC_* to the client and requires the literal string, so
 * this is the only way to keep the adapter typed without `any`.
 */
interface ImportMetaEnv {
  readonly PUBLIC_ANALYTICS_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}