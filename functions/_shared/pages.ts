export type PagesFunction<Env = Record<string, unknown>> = (context: {
  env: Env;
  request: Request;
  params: Record<string, string | string[]>;
  data: Record<string, unknown>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
}) => Response | Promise<Response>;
