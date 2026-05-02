declare module 'cherry-markdown/dist/cherry-markdown.engine.core.esm.js' {
  interface CherryEngineOptions {
    engine?: {
      global?: {
        classicBr?: boolean;
        flowSessionContext?: boolean;
      };
      syntax?: Record<string, any>;
    };
    [key: string]: any;
  }

  class CherryEngine {
    constructor(options?: CherryEngineOptions);
    makeHtml(md: string, returnType?: 'string' | 'object', forceNoCursor?: boolean): string;
    makeMarkdown(html: string): string;
    clearCache(): void;
  }

  export default CherryEngine;
}
