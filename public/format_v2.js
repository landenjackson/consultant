        // High-Legibility & Non-Code Output Parser (Clean Numbers, Bold Labels)
        function formatTelemetryOutput(text) {
            return text
                // Header Styling (Section Titles)
                .replace(/^###\s+(.+)$/gm, '<div class="friendly-section-header">$1</div>')
                // Bold Highlights
                .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#ffffff; font-weight:700;">$1</strong>')
                // High-Legibility Metrics: • Metric Name: Value — Description
                .replace(/^[\*\•\-]\s+([^:\n\r]+):\s*([^\—\-\n\r]+)[\—\-]\s*(.+)$/gm, 
                    '<div class="metric-card-row">' +
                        '<div class="metric-title-badge">$1</div>' +
                        '<div class="metric-value-pill">$2</div>' +
                        '<div class="metric-desc-text">$3</div>' +
                    '</div>'
                )
                // Fallback Metric Pills: [Name: Value]
                .replace(/\[([A-Za-z0-9_\s\/\-\$\.%]+?)\]\s*[:=]\s*([^\n\r<]+)/g, '<div class="metric-pill"><span>$1:</span> <strong>$2</strong></div>')
                // Standard Bullet Points
                .replace(/^[\*\•\-]\s+(.+)$/gm, '<div style="display:flex; align-items:flex-start; gap:8px; margin:5px 0;"><span style="color:#22c55e; font-weight:bold; line-height:1.6;">•</span><span style="flex:1;">$1</span></div>')
                // Numbered Steps
                .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex; align-items:flex-start; gap:8px; margin:7px 0;"><span style="color:#4ade80; font-weight:700; min-width:20px; line-height:1.6;">$1.</span><span style="flex:1;">$2</span></div>')
                // Natural Paragraph Spacing
                .replace(/\n\n/g, '<div style="height:12px;"></div>')
                .replace(/\n/g, '<br>');
        }
