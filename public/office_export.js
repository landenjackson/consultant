        function exportExcelXLSX(btn) {
            const card = btn.closest('.message-card');
            const memoBody = card ? (card.querySelector('.memo-editable-body') || card) : null;
            const text = memoBody ? (memoBody.innerText || memoBody.textContent) : "";
            
            const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const wsSelect = document.getElementById('clientWorkspace');
            const wsName = wsSelect ? wsSelect.options[wsSelect.selectedIndex].text.replace(/^[^\w]+/, '').trim() : "Business";

            // Extract metrics from text
            const regex = /•\s+([^:\n\r]+):\s*([^\—\-\n\r]+)[\—\-]\s*(.+)/g;
            let match;
            let rowsHtml = '';
            
            while ((match = regex.exec(text)) !== null) {
                rowsHtml += `
                <tr>
                    <td style="font-weight:bold; border:1px solid #cbd5e1; padding:8px;">${match[1].trim()}</td>
                    <td style="font-weight:bold; color:#15803d; border:1px solid #cbd5e1; padding:8px;">${match[2].trim()}</td>
                    <td style="border:1px solid #cbd5e1; padding:8px;">${match[3].trim()}</td>
                </tr>`;
            }

            if (!rowsHtml) {
                rowsHtml = `
                <tr>
                    <td style="font-weight:bold; border:1px solid #cbd5e1; padding:8px;">Operational Briefing</td>
                    <td style="font-weight:bold; color:#15803d; border:1px solid #cbd5e1; padding:8px;">Complete</td>
                    <td style="border:1px solid #cbd5e1; padding:8px;">${text.substring(0, 120)}...</td>
                </tr>`;
            }

            const excelTemplate = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>${wsName} Financials</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
    <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
</head>
<body style="font-family: Calibri, sans-serif;">
    <table style="border-collapse:collapse; width:100%;">
        <tr style="background:#0f172a; color:#ffffff;">
            <th colspan="3" style="font-size:16px; font-weight:bold; padding:14px; text-align:left;">
                CONSULTANT STUDIO // FINANCIAL & OPERATIONAL MODEL (${wsName})
            </th>
        </tr>
        <tr style="background:#f1f5f9;">
            <td colspan="3" style="padding:8px; font-size:11px; color:#475569;">
                Status: Verified Production Model | Generated: ${timestamp} | Standard: Human-in-the-Loop Governance
            </td>
        </tr>
        <tr><td colspan="3" style="height:10px;"></td></tr>
        <tr style="background:#22c55e; color:#ffffff; font-weight:bold;">
            <th style="border:1px solid #15803d; padding:10px; text-align:left; width:220px;">Telemetry Benchmark</th>
            <th style="border:1px solid #15803d; padding:10px; text-align:left; width:140px;">Value / Target</th>
            <th style="border:1px solid #15803d; padding:10px; text-align:left;">Financial & Operational Rationale</th>
        </tr>
        ${rowsHtml}
        <tr><td colspan="3" style="height:15px;"></td></tr>
        <tr style="background:#f8fafc;">
            <td colspan="3" style="border:1px solid #cbd5e1; padding:10px; font-size:11px; color:#334155;">
                <strong>Operator Sign-Off:</strong> Landen Jackson (Lead Strategic Operator) • 100% Boardroom & Bank Clearance
            </td>
        </tr>
    </table>
</body>
</html>`;

            const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${wsName.replace(/\s+/g, '_')}_Financial_Model_${Date.now()}.xls`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1500);
        }

        function exportPowerPointDeck(btn) {
            const card = btn.closest('.message-card');
            const memoBody = card ? (card.querySelector('.memo-editable-body') || card) : null;
            const text = memoBody ? (memoBody.innerText || memoBody.textContent) : "";

            const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const wsSelect = document.getElementById('clientWorkspace');
            const wsName = wsSelect ? wsSelect.options[wsSelect.selectedIndex].text.replace(/^[^\w]+/, '').trim() : "Business";

            const pptTemplate = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:p="urn:schemas-microsoft-com:office:powerpoint" xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
    <style>
        body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background:#090a0c; color:#ffffff; padding:30px; }
        .slide-card { background:#0f1216; border:2px solid #1c2028; border-left:6px solid #22c55e; border-radius:10px; padding:30px; margin-bottom:30px; }
        .slide-title { font-size:24px; font-weight:bold; color:#ffffff; margin-bottom:12px; }
        .slide-kicker { font-size:12px; color:#4ade80; text-transform:uppercase; letter-spacing:0.08em; font-weight:bold; margin-bottom:6px; }
        .slide-body { font-size:14px; color:#cbd5e1; line-height:1.6; }
    </style>
</head>
<body>
    <div class="slide-card">
        <div class="slide-kicker">Executive Strategy Briefing // Slide 1</div>
        <div class="slide-title">CONSULTANT STUDIO: ${wsName.toUpperCase()}</div>
        <div class="slide-body">
            <p><strong>Strategic Mandate:</strong> Executive Operations & Financial Telemetry</p>
            <p><strong>Date:</strong> ${timestamp}</p>
            <p><strong>Operator Clearance:</strong> Landen Jackson • Lead Strategic Operator</p>
        </div>
    </div>

    <div class="slide-card">
        <div class="slide-kicker">Strategic Memorandum // Slide 2</div>
        <div class="slide-title">Executive Diagnosis & Operational Reality</div>
        <div class="slide-body">
            ${text.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>')}
        </div>
    </div>
</body>
</html>`;

            const blob = new Blob([pptTemplate], { type: 'application/vnd.ms-powerpoint;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${wsName.replace(/\s+/g, '_')}_Executive_Deck_${Date.now()}.ppt`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 1500);
        }
