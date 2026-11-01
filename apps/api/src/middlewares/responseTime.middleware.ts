import type { Request, Response } from 'express';
import { Histogram } from 'prom-client';
import responseTimeLib from 'response-time';

// HTTP latency per route (FND-17) — the base instrument; no dashboard in this
// feature.
export const reqResTime = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duração das requisições HTTP em segundos',
  labelNames: ['method', 'route', 'status_code'],
});

// Extracted from the `response-time` wrapper so it can be tested without depending on the
// library's res.end monkey-patch.
export const recordResponseTime = (req: Request, res: Response, time: number): void => {
  const route = req.route?.path ? `${req.baseUrl}${req.route.path}` : req.path;
  reqResTime.observe({ method: req.method, route, status_code: res.statusCode }, time / 1000);
};

export const responseTime = responseTimeLib(recordResponseTime);
