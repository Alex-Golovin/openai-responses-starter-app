declare module 'slug' {
  export type SlugOptions = {
    lower?: boolean;
    trim?: boolean;
    fallback?: string;
  };

  export interface SlugFunction {
    (value: string, options?: SlugOptions): string;
    defaults: {
      mode?: string;
      [key: string]: unknown;
    };
  }

  const slug: SlugFunction;
  export default slug;
}
