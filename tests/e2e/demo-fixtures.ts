// Original synthetic questions for local verification, not approved release content.
const sets = {
  marketing: [
    [
      "What is a target market?",
      "A group a business aims to serve",
      "Every competing business",
      "An inventory count",
      "A product warranty",
    ],
    [
      "Which metric measures clicks divided by impressions?",
      "Click-through rate",
      "Gross margin",
      "Inventory turnover",
      "Return rate",
    ],
    [
      "Which activity gathers first-hand customer feedback?",
      "Interviewing customers",
      "Reading a census report",
      "Reviewing a competitor website",
      "Reading an industry article",
    ],
    [
      "Which element of the marketing mix covers distribution?",
      "Place",
      "Price",
      "Product",
      "Promotion",
    ],
    [
      "Which message best communicates a product benefit?",
      "Keeps drinks cold for eight hours",
      "Comes in a box",
      "Has item code 742",
      "Is listed on page six",
    ],
  ],
  finance: [
    [
      "What is left after expenses are subtracted from revenue?",
      "Profit",
      "Inventory",
      "Revenue",
      "Cash receipts",
    ],
    [
      "Which statement summarizes assets, liabilities, and equity?",
      "Balance sheet",
      "Sales forecast",
      "Purchase order",
      "Bank deposit slip",
    ],
    [
      "What does a budget primarily help a business do?",
      "Plan income and spending",
      "Register a trademark",
      "Assign employee shifts",
      "Ship packages",
    ],
    [
      "Which is an example of a fixed monthly cost?",
      "A fixed rent payment",
      "Packaging per item",
      "A commission per sale",
      "Raw materials per unit",
    ],
    [
      "At the break-even point, which amounts are equal?",
      "Total revenue and total costs",
      "Assets and revenue",
      "Profit and expenses",
      "Cash and inventory",
    ],
  ],
  management: [
    [
      "What is delegation?",
      "Assigning responsibility for a task",
      "Cancelling a task",
      "Increasing prices",
      "Counting inventory",
    ],
    [
      "Which goal is measurable?",
      "Reduce returns from 8% to 5% by June",
      "Improve everything soon",
      "Be better than before",
      "Work harder this year",
    ],
    [
      "What is an agenda used for?",
      "Organizing topics for a meeting",
      "Calculating wages",
      "Setting a product price",
      "Tracking inventory",
    ],
    [
      "Which response helps resolve a workplace disagreement?",
      "Listen to both viewpoints",
      "Ignore every concern",
      "Assign blame immediately",
      "Discuss it only with uninvolved staff",
    ],
    [
      "Which document clarifies the steps in a recurring task?",
      "Standard operating procedure",
      "Bank statement",
      "Customer receipt",
      "Sales invoice",
    ],
  ],
  hospitality: [
    [
      "What should a hotel do first when a guest reports a room problem?",
      "Listen and confirm the issue",
      "Offer an unrelated upgrade",
      "Blame another department",
      "Wait for checkout",
    ],
    [
      "Which department usually checks guests into a hotel?",
      "Front desk",
      "Purchasing",
      "Engineering",
      "Accounting",
    ],
    [
      "Why record a guest's accessibility request?",
      "To arrange appropriate accommodations",
      "To increase the room price",
      "To replace the booking confirmation",
      "To avoid assigning a room",
    ],
    [
      "What does occupancy rate measure?",
      "The share of available rooms that are occupied",
      "The share of guests who order meals",
      "The average cost of laundry",
      "The number of employee shifts",
    ],
    [
      "What should staff check before confirming an event booking?",
      "Availability and the client's requirements",
      "Only the last event's invoice",
      "The daily weather alone",
      "A competitor's brochure",
    ],
  ],
  entrepreneurship: [
    [
      "Why test a prototype with potential customers?",
      "To validate assumptions before investing more",
      "To avoid customer feedback",
      "To guarantee revenue",
      "To replace all market research",
    ],
    [
      "What does a value proposition explain?",
      "Why customers should choose the offering",
      "How to issue payroll",
      "When to file every tax form",
      "Who owns neighboring businesses",
    ],
    [
      "What does bootstrapping usually mean?",
      "Starting with personal or business-generated funds",
      "Selling all shares to investors",
      "Buying a franchise",
      "Hiring an outside auditor",
    ],
    [
      "Which is an example of a business risk?",
      "A key supplier may stop delivering",
      "The product has a name",
      "The office has a mailing address",
      "A team meeting has an agenda",
    ],
    [
      "What is a minimum viable product meant to do?",
      "Test a core idea with the smallest usable version",
      "Include every planned feature",
      "Avoid any contact with customers",
      "Guarantee a market-leading price",
    ],
  ],
};

export const demoFixtures = Object.entries(sets).flatMap(([demo_id, rows]) =>
  rows.map(([prompt, correct, ...wrong], index) => {
    const choices = [...wrong];
    const key = index % 4;
    choices.splice(key, 0, correct);
    return { demo_id, position: index + 1, prompt, choices, answer: "ABCD"[key] };
  }),
);
