import type { Response, Router } from 'express';

interface RouteLayer {
  route?: {
    path: string | RegExp;
    methods: Record<string, boolean>;
  };
}

export const sendSuccess = (res: Response, data?: unknown, status = 200): void => {
  if (status === 204) {
    res.status(204).end();
    return;
  }
  res.status(status).json({ data });
};

/** Mounts a module router and prints a curl line for each route outside test and production. */
export const curlResponse = (parent: Router, mountPath: string, moduleRouter: Router): void => {
  parent.use(mountPath, moduleRouter);

  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') return;

  const stack = (moduleRouter as Router & { stack?: RouteLayer[] }).stack ?? [];
  const port = process.env.PORT || '3000';
  for (const layer of stack) {
    if (!layer.route || typeof layer.route.path !== 'string') continue;
    const routePath = layer.route.path === '/' ? '' : layer.route.path;
    for (const method of Object.keys(layer.route.methods)) {
      console.log(`curl -X ${method.toUpperCase()} http://localhost:${port}/api${mountPath}${routePath}`);
    }
  }
};
