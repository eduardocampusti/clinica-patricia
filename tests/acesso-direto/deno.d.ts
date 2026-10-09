declare namespace Deno {
  const env: { get: (nome: string) => string | undefined }
  function serve(handler: (request: Request) => Response | Promise<Response>): void
}
