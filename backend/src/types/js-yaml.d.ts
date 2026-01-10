declare module 'js-yaml' {
  export function dump(
    object: unknown,
    options?: Record<string, unknown>
  ): string;
}
