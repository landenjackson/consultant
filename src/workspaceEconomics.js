// Explicit Workspace Financial, Unit & Metric Guardrails
export const WORKSPACE_ECONOMIC_MODELS = {
  mas_diner: {
    name: "Ma's Diner",
    businessType: "Independent Heritage Diner / Restaurant",
    allowedFinancialUnits: "Dollars ($), Minutes (min), Percentages (%), Covers (guests), Table Turns",
    realisticRanges: {
      averageTicket: "$12.00 – $18.50 per guest",
      foodCostPrime: "26.0% – 32.0% of gross revenue",
      laborCostFloor: "28.0% – 34.0% of gross revenue",
      primeCostTotal: "54.0% – 64.0% (Food + Labor combined)",
      tableTurnTime: "28 – 42 minutes per table",
      ticketSpeed: "6.0 – 9.5 minutes from order to pass",
      walkShedCapture: "5.0% – 10.0% of local 10-min pedestrian radius",
      marginDefense: "100% (Strict zero discounts / coupons)"
    },
    forbiddenMetrics: "DO NOT USE: CAC, LTV, MRR, ARR, SaaS churn, software server costs, industrial boiler capacity, enterprise sales cycles."
  },

  cleaver_brooks: {
    name: "Cleaver-Brooks",
    businessType: "Industrial Thermal Engineering & Manufacturing Leader",
    allowedFinancialUnits: "Contract Value ($50k - $2.5M+), Days/Months (sales cycle), Percentages (%), Boiler Horsepower (BHP), Headcount Retention",
    realisticRanges: {
      contractValue: "$75,000 – $850,000+ per boiler system / retrofit",
      salesCycleTimeline: "90 – 270 days from RFP to sign-off",
      grossMarginTarget: "38.0% – 48.0% on capital industrial equipment",
      aftermarketPartsAttach: "22.0% – 35.0% ongoing recurring service margin",
      workforceRetention: "88.0% – 94.0% skilled boilermaker / welder retention",
      thermalEfficiencyRating: "84.0% – 88.5% combustion efficiency"
    },
    forbiddenMetrics: "DO NOT USE: Average ticket size under $1,000, table turns, restaurant prime costs, food ingredients, consumer pedestrian foot-traffic, SaaS monthly churn."
  },

  bannerman: {
    name: "Bannerman Crossings",
    businessType: "Commercial Real Estate & Suburban Lifestyle Center",
    allowedFinancialUnits: "Square Feet (sq ft), Lease Rates ($/sq ft/yr), Foot-Traffic Volume, Percentages (%), Tenant Retention",
    realisticRanges: {
      leaseRateNnn: "$28.00 – $42.00 / sq ft / year (Triple Net)",
      tenantOccupancyRate: "92.0% – 97.5% leased commercial space",
      residentCaptureRate: "6.5% – 12.0% neighborhood residents (Bannerman Commons)",
      commonAreaMaintenance: "$4.50 – $7.25 / sq ft CAM fee",
      averageDwellTime: "45 – 85 minutes per visitor visit",
      tenantSalesVolume: "$450 – $750 gross sales / sq ft annually"
    },
    forbiddenMetrics: "DO NOT USE: Boiler efficiency, SaaS subscriptions, digital ad CPC, restaurant kitchen ticket speed (unless auditing a specific restaurant tenant)."
  },

  default: {
    name: "General Business & SaaS Workspace",
    businessType: "Modern Technology, Agency, or Subscription Business",
    allowedFinancialUnits: "Dollars ($), Multipliers (x), Months, Percentages (%), Accounts",
    realisticRanges: {
      subscriptionTiers: "$15.99 / $39.99 / $79.99 monthly",
      blendedCac: "$45.00 – $140.00 per paid account",
      ltvToCacRatio: "3.5x – 5.5x multi-year value",
      cacPaybackTimeline: "3.2 – 6.5 months to full recovery",
      grossMarginFloor: "80.0% – 88.0% software gross margin",
      monthlyChurnCeiling: "< 2.0% monthly logo churn"
    },
    forbiddenMetrics: "DO NOT USE: Restaurant table turns, egg/dairy costs, industrial boiler horsepower, physical real estate lease rates."
  }
};
