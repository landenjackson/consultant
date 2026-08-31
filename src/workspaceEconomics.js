// Comprehensive Industry Economic Models for Consultant Studio
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

  healthcare_clinic: {
    name: "Medical Practice & Specialty Clinic",
    businessType: "Doctor's Office, Dental, Primary Care & Outpatient Surgery",
    allowedFinancialUnits: "Reimbursement Rates ($), RVU (Relative Value Units), Patient Visit Duration (min), Show-Rate (%), No-Show Drag ($)",
    realisticRanges: {
      averagePatientEncounter: "$145.00 – $385.00 blended reimbursement",
      noShowRateFloor: "< 5.5% (with automated 48-hr SMS deposit confirmation)",
      providerUtilization: "84.0% – 91.0% scheduled clinical capacity",
      patientRetentionRate: "78.0% – 86.0% annual care continuity",
      clinicalLaborCost: "32.0% – 38.0% of collections (RNs, MAs, Billing)",
      claimsDenialCeiling: "< 3.2% clean first-pass submission rate"
    },
    forbiddenMetrics: "DO NOT USE: Restaurant table turns, software churn, industrial boiler specs, retail discounts."
  },

  fitness_wellness: {
    name: "Fitness Studio & Performance Gym",
    businessType: "Boutique Fitness, Personal Training & Athletic Performance Center",
    allowedFinancialUnits: "Monthly Dues ($/member), Member Capacity, Churn Rate (%/mo), Session Utilization (%), LTV ($)",
    realisticRanges: {
      monthlyMembershipDues: "$129.00 – $229.00 / month recurring dues",
      trainerSplitPercentage: "40.0% – 50.0% session gross margin payout",
      monthlyMemberChurn: "< 4.2% monthly logo churn floor",
      classCapacityUtilization: "76.0% – 88.0% peak morning/evening floor fill",
      ancillarySpendAttach: "$28.00 – $45.00 / member / mo (Supplements, Recovery, Gear)",
      cacPaybackVelocity: "1.8 – 3.2 months per new member acquisition"
    },
    forbiddenMetrics: "DO NOT USE: Medical insurance denial rates, boiler horsepower, food prep speeds."
  },

  therapy_psychology: {
    name: "Therapy & Mental Health Practice",
    businessType: "Private Therapy Practice, Psychological Services & Counseling",
    allowedFinancialUnits: "Private Pay Rate ($/hr), Clinical Hours / Week, Retention Weeks, Direct Insurance Reimbursement ($)",
    realisticRanges: {
      privatePayHourlyRate: "$150.00 – $240.00 per 50-min clinical hour",
      clinicianCaseloadTarget: "22 – 28 clinical billable hours / week",
      patientCareEpisodeLength: "14 – 24 consecutive weeks of active care",
      lateCancellationDrop: "< 4.0% with 24-hr card-on-file cancellation covenant",
      practiceOverheadFloor: "18.0% – 24.0% (EHR, billing, physical suite lease)",
      telehealthMixRatio: "35.0% – 60.0% hybrid remote caseload"
    },
    forbiddenMetrics: "DO NOT USE: High-volume foot-traffic interception, restaurant table turns, industrial fabrication metrics."
  },

  engineering_firm: {
    name: "Engineering & Technical Consulting Firm",
    businessType: "Civil, Mechanical, Structural Engineering & Environmental Services",
    allowedFinancialUnits: "Billable Hourly Rate ($/hr), Utilization Rate (%), Multiplier (x Raw Labor), Project Backlog (Months)",
    realisticRanges: {
      blendedBillableRate: "$165.00 – $295.00 / hour across engineering staff",
      directLaborMultiplier: "2.85x – 3.40x direct salary cost",
      engineerUtilizationTarget: "82.0% – 88.0% billable time allocation",
      projectBacklogPipeline: "4.5 – 8.0 months contracted pipeline coverage",
      proposalWinRate: "42.0% – 58.0% on competitive municipal/private RFPs",
      changeOrderMarginLift: "+8.5% – +14.0% on expanded project scope"
    },
    forbiddenMetrics: "DO NOT USE: Diner table turns, fitness gym memberships, consumer retail discounting."
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
