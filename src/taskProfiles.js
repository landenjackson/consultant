// Dynamic Task Context & Prompt Generator for Consultant Studio
export const TASK_PROFILES = {
  trade_analysis: {
    name: "Trade Area & Catchment Geometry",
    kicker: "LOCAL TRADE INTELLIGENCE",
    focus: "Physical trade-area geometry, pedestrian walking catchments, neighborhood demographics, competitor proximity, and foot-traffic interception during shoulder hours.",
    metricLabels: [
      "Neighborhood Capture Rate",
      "Trade Area Density Index",
      "Pedestrian Foot-Traffic Lift",
      "Zero-Discount Margin Score",
      "Catchment Radius Efficiency",
      "Shoulder Hour Capacity Utilization"
    ],
    roadmapFocus: "Physical trade-area capture, frontline routing, neighborhood partnerships, and foot-traffic interception."
  },
  trust: {
    name: "Trust & Reputation Audit",
    kicker: "REPUTATION & BRAND INTEGRITY",
    focus: "Brand credibility, consumer anxiety barriers, transparency bottlenecks, pricing confidence, and human-in-the-loop ethical assurances.",
    metricLabels: [
      "Trust Alignment Index",
      "Brand Vulnerability Tier",
      "Human Verification Gate Score",
      "Price Transparency Rating",
      "Projected Retention Lift",
      "Customer Skepticism Reduction"
    ],
    roadmapFocus: "Eliminating transparency friction, establishing verified proof points, and structuring human oversight gates."
  },
  saas: {
    name: "Unit Economics & Capital Viability",
    kicker: "FINANCIAL & UNIT ECONOMICS",
    focus: "Customer Acquisition Cost (CAC), Lifetime Value (LTV), payback velocity, gross margin health, churn compression, and pricing tier staircases.",
    metricLabels: [
      "Blended Target CAC",
      "LTV to CAC Ratio",
      "CAC Payback Period",
      "Gross Margin Health",
      "Net Revenue Retention Rate",
      "Monthly Churn Ceiling"
    ],
    roadmapFocus: "FinOps unit caps, pricing step-up triggers, annual prepay incentives, and cash-flow acceleration."
  },
  campaign_strategy: {
    name: "Zero-Discount Campaign Strategy",
    kicker: "MULTI-CHANNEL CAMPAIGN ROADMAP",
    focus: "High-texture brand storytelling, seasonal product launches, community-first event rituals, and organic word-of-mouth momentum without margin erosion.",
    metricLabels: [
      "Campaign Conversion Target",
      "Organic Word-of-Mouth Lift",
      "Average Ticket Size Expansion",
      "Zero-Discount Price Realization",
      "Frontline Attachment Rate",
      "90-Day Regulars Acquisition"
    ],
    roadmapFocus: "Multi-week campaign rollout, frontline staff briefing, tactile print/social asset alignment, and ROI measurement."
  },
  competitor: {
    name: "Competitor Market Reconnaissance",
    kicker: "MARKET RECON & DIFFERENTIATION",
    focus: "Direct competitor positioning, pricing vulnerability scans, unmet customer demand gaps, and defensive moat engineering.",
    metricLabels: [
      "Market Differentiation Index",
      "Competitor Pricing Spread",
      "Defensive Moat Strength",
      "Switching Barrier Height",
      "Underserved Demand Ratio",
      "Category Leadership Score"
    ],
    roadmapFocus: "Exploiting competitor blind spots, sharpening value propositions, and commanding premium price points."
  },
  pricing: {
    name: "Pricing Architecture & Margin Defense",
    kicker: "PRICING STRATEGY & PROFITABILITY",
    focus: "Value-based pricing packaging, premium anchoring, psychological tier design, menu/plan margin defense, and discount elimination.",
    metricLabels: [
      "Target Gross Margin",
      "Price Inelasticity Score",
      "Blended ARPU Expansion",
      "Discount Resistance Rating",
      "High-Tier Mix Target",
      "Payback Velocity"
    ],
    roadmapFocus: "Restructuring pricing ladders, implementing value packaging, and training sales/floor teams on value defense."
  },
  fsu_trust: {
    name: "Empirical SPSS Trust Architecture",
    kicker: "STATISTICAL RESEARCH & DATA SOVEREIGNTY",
    focus: "FSU Qualtrics research modeling (p < .001), privacy risk mitigation, Pearson correlation retention drivers (r = 0.38), and autonomous failure defense.",
    metricLabels: [
      "Empirical Trust Boundary Score",
      "Statistical Risk Significance (p-val)",
      "Retention Correlation (r-val)",
      "Autonomy Risk Penalty Avoidance",
      "Data Sovereignty Compliance",
      "Operator Verification Index"
    ],
    roadmapFocus: "Deploying empirical trust boundaries, establishing synchronous human gates, and guaranteeing zero public model training."
  },
  custom: {
    name: "Custom Strategic Directive",
    kicker: "BESPOKE OPERATIONAL OBJECTIVE",
    focus: "Bespoke business goals, tailored operational troubleshooting, custom campaign planning, or executive scenario modeling.",
    metricLabels: [
      "Objective Completion Target",
      "Operational Efficiency Lift",
      "Risk Mitigation Rating",
      "Capital ROI Projection",
      "Resource Utilization Rate",
      "Execution Velocity Multiplier"
    ],
    roadmapFocus: "Custom phase-by-phase execution, cross-functional milestone ownership, and verified outcome telemetry."
  }
};

export const WORKSPACE_PROFILES = {
  mas_diner: {
    name: "Ma's Diner",
    type: "Independent Heritage Diner & Community Hub",
    coreMandate: "Zero promotional discounting, high-margin seasonal specials (omelettes, fresh orchard fruit, heritage recipes), breakfast/lunch peak throughput, and 'Analog Connection / Community Huddle' positioning.",
    toneNotes: "Warm, grounded, hospitality-first, highly attuned to kitchen prep and floor server turnover."
  },
  cleaver_brooks: {
    name: "Cleaver-Brooks",
    type: "Industrial Thermal Engineering & Manufacturing Leader",
    coreMandate: "Bridging legacy boiler/energy heritage with modern digital narratives, high-skill talent acquisition, and technical communication alignment.",
    toneNotes: "Industrial, authoritative, institutional, focused on operational excellence and workforce brand equity."
  },
  bannerman: {
    name: "Bannerman Crossings",
    type: "Suburban Commercial Lifestyle Center & Retail Trade Area",
    coreMandate: "Walkable neighborhood resident capture (Bannerman Commons), morning commuter foot-traffic, commercial entitlement preservation, and zero-discount third-place tenancy.",
    toneNotes: "Commercial real estate analytics, foot-traffic geometry, neighborhood density, and retail ecosystem synergy."
  },
  default: {
    name: "General Enterprise Workspace",
    type: "Modern Multi-Disciplinary Business Operation",
    coreMandate: "Unit economics optimization, high-retention customer acquisition, human-in-the-loop orchestration, and defensible competitive positioning.",
    toneNotes: "Surgical, articulate, Wall Street Journal columnist and Chief of Staff analytical rigor."
  }
};
