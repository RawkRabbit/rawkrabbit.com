// rawkrabbit.com Worker.
//
// Everything is served from the static Astro build in dist/, except
// /bourboncompare/, which is built and hosted on Vercel. Requests for that path
// are forwarded to the Vercel deployment and the response is passed back, so
// visitors stay on rawkrabbit.com.
//
// The Worker only runs for /bourboncompare (see run_worker_first in
// wrangler.jsonc); every other path goes straight to the static files.

const PREFIX = '/bourboncompare';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === PREFIX || url.pathname.startsWith(`${PREFIX}/`)) {
      return proxyToVercel(request, url, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function proxyToVercel(request, url, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  const origin = new URL(env.BOURBON_ORIGIN);
  const target = new URL(url.pathname + url.search, origin);

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cookie');

  const upstream = await fetch(target, { method: request.method, headers, redirect: 'manual' });
  const response = new Response(upstream.body, upstream);

  // Keep redirects on rawkrabbit.com instead of sending visitors to vercel.app.
  const location = response.headers.get('location');
  if (location) {
    const loc = new URL(location, target);
    if (loc.host === origin.host) {
      loc.protocol = url.protocol;
      loc.host = url.host;
      response.headers.set('location', loc.toString());
    }
  }

  // Vercel-only headers that should not leak through.
  response.headers.delete('set-cookie');
  response.headers.delete('x-vercel-id');
  response.headers.delete('x-vercel-cache');
  response.headers.delete('x-robots-tag');
  return response;
}
