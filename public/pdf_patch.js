        function printExecutivePDF(content) {
            const printWindow = window.open('', '_blank');
            const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const wsName = document.getElementById('currentWorkspaceDisplay')?.textContent || 'Consultant Studio';
            
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Executive Briefing — ${wsName}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body {
            font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif;
            color: #0f172a;
            background: #ffffff;
            line-height: 1.6;
            padding: 40px;
        }
        .header-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 24px;
        }
        .brand-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .badge {
            display: inline-block;
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .memo-body {
            font-size: 14px;
            margin-bottom: 30px;
        }
        .memo-body h3 {
            font-size: 16px;
            font-weight: 800;
            margin: 20px 0 8px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            color: #0f172a;
        }
        .signoff-seal {
            border: 2px solid #22c55e;
            border-radius: 8px;
            padding: 16px 20px;
            background: #f0fdf4;
            margin-top: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .seal-title {
            font-size: 12px;
            font-weight: 800;
            color: #15803d;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .seal-operator {
            font-size: 14px;
            font-weight: 700;
            color: #0f172a;
        }
        @media print {
            body { padding: 20px; }
            button { display: none; }
        }
    </style>
</head>
<body>
    <div class="header-bar">
        <div class="brand-title">
            <svg viewBox="0 0 120 120" width="28" height="28">
                <path d="M 60 16 C 60 38, 38 60, 16 60 C 38 60, 60 82, 60 104 C 60 82, 82 60, 104 60 C 82 60, 60 38, 60 16 Z" fill="none" stroke="#22c55e" stroke-width="8" stroke-linecap="round"/>
                <circle cx="34" cy="86" r="7" fill="#22c55e"/>
                <path d="M 86 28 L 86 44 M 78 36 L 94 36" stroke="#22c55e" stroke-width="7" stroke-linecap="round"/>
            </svg>
            CONSULTANT STUDIO
        </div>
        <div style="text-align:right;">
            <div class="badge">Boardroom Ready // ${wsName}</div>
            <div style="font-size:11px; color:#64748b; margin-top:4px;">Generated: ${timestamp}</div>
        </div>
    </div>

    <div class="memo-body">
        ${formatTelemetryOutput(content)}
    </div>

    <div class="signoff-seal">
        <div>
            <div class="seal-title">Official Human Governance Gate</div>
            <div class="seal-operator">Landen Jackson • Lead Strategic Operator</div>
            <div style="font-size:11px; color:#64748b;">Verification Standard: 100% Human-Verified Production Clearance</div>
        </div>
        <div style="text-align:right; font-size:11px; color:#15803d; font-weight:700;">
            ✓ VERIFIED AUDIT
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(() => { window.print(); }, 400);
        };
    </script>
</body>
</html>
            `;
            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }
