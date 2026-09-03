        // Ultra-Fast Direct Client Inference Pipeline (Zero Blocking)
        async function fetchInference(messages, lens) {
            const promptHeader = `You are Consultant, a Surgical Executive Operations Partner. Zero filler. Always output mandatory headers: **SYSTEM AUDIT & STRATEGIC POSITIONING**, **QUANTITATIVE TELEMETRY** (with [METRIC] = [VALUE]), and **OPERATIONAL EXECUTION PROTOCOL**.\n\n`;
            
            // AbortController to enforce a strict 12s timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            try {
                // Direct High-Speed Gemini 3.7 Flash Gateway Call
                const directRes = await fetch('https://api.myclaw.ai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer 8743661c-dd5c-4c00-93c9-b7ec8030b4e1.ea5242e6-d13a-4060-9782-bc6e18274cb1',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    body: JSON.stringify({
                        model: 'gemini-3.7-flash',
                        messages: [{ role: 'system', content: promptHeader }, ...messages],
                        temperature: 0.5,
                        max_tokens: 1500
                    }),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!directRes.ok) {
                    const errText = await directRes.text();
                    throw new Error(`Gateway returned HTTP ${directRes.status}: ${errText.substring(0, 100)}`);
                }

                const data = await directRes.json();
                return data.choices?.[0]?.message?.content || "Telemetry output calculated.";

            } catch (e) {
                clearTimeout(timeoutId);
                if (e.name === 'AbortError') {
                    throw new Error("Request timed out after 12s. Please check your network connection and retry.");
                }
                throw e;
            }
        }
