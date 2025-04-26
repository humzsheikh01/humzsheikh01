interface ViteDevServer {
  middlewares: any;
  transformIndexHtml(url: string, html: string): Promise<string>;
  ssrFixStacktrace(error: Error): void;
}

declare module 'vite' {
  export function createServer(config: any): Promise<ViteDevServer>;
}