export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Proxy /api/chat directly through the VPS where IP is whitelisted
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };

      try {
        const body = await request.text();
        const vpsRes = await fetch('http://15.204.101.250:3000/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body
        });

        const vpsData = await vpsRes.text();
        return new Response(vpsData, {
          status: vpsRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: `Relay error: ${e.message}` }), {
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
