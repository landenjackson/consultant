        // Direct Same-Origin /api/chat Inference with Full Error Passthrough
        async function fetchInference(messages, lens) {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, lens })
            });

            const data = await res.json().catch(() => ({}));
            
            if (!res.ok) {
                throw new Error(data.error || `Server responded with ${res.status}`);
            }

            return data.choices?.[0]?.message?.content || "Telemetry output calculated.";
        }
