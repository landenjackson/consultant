        // Clean, Professional Formatting Engine (Zero Code Look, Elegant Typography)
        function formatTelemetryOutput(text) {
            return text
                // Clean Level 3 Headers: ### Header
                .replace(/^###\s+(.+)$/gm, '<div class="friendly-section-header">$1</div>')
                // Bold Headers: **Header**
                .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#ffffff; font-weight:700;">$1</strong>')
                // Metric Badges: [Name: Value] or [Name = Value]
                .replace(/\[([A-Za-z0-9_\s\/\-\$\.%]+?)\]\s*[:=]\s*([^\n\r<]+)/g, '<div class="metric-pill"><span>$1:</span> <strong>$2</strong></div>')
                // Clean Bullet Points: • Item or * Item
                .replace(/^[\*\•\-]\s+(.+)$/gm, '<div style="display:flex; align-items:flex-start; gap:8px; margin:5px 0;"><span style="color:#10b981; font-weight:bold; line-height:1.6;">•</span><span style="flex:1;">$1</span></div>')
                // Clean Numbered Lists: 1. Item
                .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex; align-items:flex-start; gap:8px; margin:8px 0;"><span style="color:#34d399; font-weight:700; min-width:20px; line-height:1.6;">$1.</span><span style="flex:1;">$2</span></div>')
                // Natural Paragraph Spacing
                .replace(/\n\n/g, '<div style="height:12px;"></div>')
                .replace(/\n/g, '<br>');
        }
