export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Relay /api/chat directly through the secure Cloudflare Quick Tunnel to the whitelisted VPS
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      try {
        const body = await request.text();
        const tunnelRes = await fetch('https://cause-enjoy-rose-visited.trycloudflare.com/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body
        });

        const tunnelData = await tunnelRes.text();
        return new Response(tunnelData, {
          status: tunnelRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: `Tunnel relay error: ${e.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
