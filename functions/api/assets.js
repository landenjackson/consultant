// Cloudflare Pages Functions API Handler for /api/assets
export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const base44Headers = {
    'Content-Type': 'application/json',
    'api_key': '7f28728cc59a411783064ffb31020a28',
    'X-App-Id': '6a847abd94e877b8b9556a57'
  };

  try {
    // GET
    if (request.method === 'GET') {
      const workspace = url.searchParams.get('workspace');
      const b44Res = await fetch('https://base44.app/api/apps/6a847abd94e877b8b9556a57/entities/FileAsset', {
        headers: base44Headers
      });

      let assets = [];
      if (b44Res.ok) {
        assets = await b44Res.json();
      }

      if (workspace && workspace !== 'default' && Array.isArray(assets)) {
        assets = assets.filter(a => a.notes === workspace || (a.name && a.name.includes(workspace)));
      }

      return new Response(JSON.stringify({ assets: assets || [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST
    if (request.method === 'POST') {
      const body = await request.json();
      const { name, title, content, workspace = 'default' } = body;
      const assetName = name || title || `Briefing_${Date.now()}`;

      const b44Res = await fetch('https://base44.app/api/apps/6a847abd94e877b8b9556a57/entities/FileAsset', {
        method: 'POST',
        headers: base44Headers,
        body: JSON.stringify({
          name: assetName,
          file_url: `data:text/plain;charset=utf-8,${encodeURIComponent(content)}`,
          notes: workspace,
          kind: 'other'
        })
      });

      let created = null;
      if (b44Res.ok) {
        created = await b44Res.json();
      } else {
        created = { id: `local_${Date.now()}`, name: assetName, notes: workspace };
      }

      return new Response(JSON.stringify({ asset: created }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
