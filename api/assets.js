import { createClient } from '@base44/sdk';

// Initialize the Base44 SDK client
const base44 = createClient({
  appId: "6a847abd94e877b8b9556a57",
  headers: {
    "api_key": "7f28728cc59a411783064ffb31020a28"
  }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: List all FileAssets (optionally filtered by workspace)
    if (req.method === 'GET') {
      const { workspace } = req.query || {};
      let assets = [];
      
      if (base44.entities && base44.entities.FileAsset) {
        assets = await base44.entities.FileAsset.list({
          limit: 50,
          sort: { created_at: -1 }
        });
      }

      // Filter in-memory if workspace is specified and not default
      if (workspace && workspace !== 'default' && Array.isArray(assets)) {
        assets = assets.filter(a => a.workspace === workspace);
      }

      return res.status(200).json({ assets: assets || [] });
    }

    // POST: Create a new FileAsset in Base44 Data
    if (req.method === 'POST') {
      const { name, title, content, workspace = 'default', metrics_csv, type = 'telemetry_brief' } = req.body;

      if (!content) {
        return res.status(400).json({ error: 'Asset content is required' });
      }

      const assetName = name || title || `Briefing_${Date.now()}`;

      let createdAsset = null;
      if (base44.entities && base44.entities.FileAsset) {
        createdAsset = await base44.entities.FileAsset.create({
          name: assetName,
          title: assetName,
          content: content,
          workspace: workspace,
          metrics_csv: metrics_csv || '',
          type: type,
          created_at: new Date().toISOString()
        });
      } else {
        // Fallback response if entity schema is slightly different
        createdAsset = {
          id: `local_${Date.now()}`,
          name: assetName,
          title: assetName,
          content: content,
          workspace: workspace,
          metrics_csv: metrics_csv,
          type: type,
          created_at: new Date().toISOString()
        };
      }

      return res.status(201).json({ asset: createdAsset });
    }

    // DELETE: Remove a FileAsset by ID
    if (req.method === 'DELETE') {
      const { id } = req.query || req.body || {};
      if (id && base44.entities && base44.entities.FileAsset) {
        await base44.entities.FileAsset.delete(id);
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('FileAsset API Error:', error);
    return res.status(500).json({ error: error.message || 'FileAsset operation failed' });
  }
}
