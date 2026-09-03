        // Live Stripe Subscription Management & Session Handling
        const STRIPE_LINKS = {
            starter: "https://buy.stripe.com/test_aFa28t6NY3Ze3fy8xses000",
            pro: "https://buy.stripe.com/test_eVqdRba0a53ibM4cNIes001",
            executive: "https://buy.stripe.com/test_cNidRb4FQeDSbM49Bwes002",
            portal: "https://billing.stripe.com/p/login/test_YOUR_PORTAL_KEY"
        };

        function redirectToStripe(plan) {
            const link = STRIPE_LINKS[plan] || STRIPE_LINKS.starter;
            if (link && !link.includes('YOUR_PORTAL_KEY')) {
                window.location.href = link;
            } else {
                alert(`Redirecting to secure Stripe Checkout for ${plan.toUpperCase()}...`);
            }
        }

        // Check for post-checkout success parameters
        function checkSubscriptionStatus() {
            const params = new URLSearchParams(window.location.search);
            if (params.get('session') === 'success' || params.get('checkout') === 'success') {
                localStorage.setItem('consultant_pro_active', 'true');
                showToast("🎉 Subscription Confirmed! Full Pro/Executive features unlocked.");
                // Clean URL parameters
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }

        function showToast(msg) {
            const toast = document.createElement('div');
            toast.className = 'turnaround-catalyst';
            toast.style.position = 'fixed';
            toast.style.bottom = '24px';
            toast.style.right = '24px';
            toast.style.zIndex = '9999';
            toast.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)';
            toast.innerHTML = `<span class="turnaround-icon">★</span><div>${msg}</div>`;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 6000);
        }
