import client from "../ai/openaiClient";

function parseJson(content) {
  const text = (content || "").trim();
  const block = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const payload = block ? block[1].trim() : text;
  return JSON.parse(payload);
}

export async function decideAgentAction({ message, datasetSummary }) {
  if (!process.env.REACT_APP_OPENAI_API_KEY) {
    throw new Error("Missing REACT_APP_OPENAI_API_KEY in .env");
  }

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "agent_decision",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            action: {
              type: "string",
              enum: [
                "add_expense",
                "get_highest_expense",
                "overspend_by_category",
                "total_spent",
                "compare_category_increase",
                "summarize_habits",
                "budget_status",
                "set_budget",
                "monthly_forecast",
                "behavior_insights",
                "financial_health_score",
                "delete_all_expenses",
                "help",
                "clarifying_question",
              ],
            },
            args: {
              type: "object",
              additionalProperties: false,
              properties: {
                amount: { type: ["number", "null"] },
                categoryPhrase: { type: ["string", "null"] },
                datePhrase: { type: ["string", "null"] },
                period: { type: ["string", "null"], enum: ["this_month", "last_month", "all", null] },
                confirm: { type: ["boolean", "null"] },
                question: { type: ["string", "null"] },
              },
              required: ["amount", "categoryPhrase", "datePhrase", "period", "confirm", "question"],
            },
          },
          required: ["action", "args"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content: [
          "You are an expense-tracker decision engine.",
          "Return JSON with action and args only.",
          "Do not compute totals or analytics.",
          "Choose one action:",
          "- add_expense(amount, categoryPhrase, datePhrase)",
          "- get_highest_expense(period)",
          "- overspend_by_category(period)",
          "- total_spent(period)",
          "- compare_category_increase()",
          "- summarize_habits()",
          "- budget_status()",
          "- set_budget(amount)",
          "- monthly_forecast()",
          "- behavior_insights()",
          "- financial_health_score()",
          "- delete_all_expenses(confirm)",
          "- help()",
          "- clarifying_question(question)",
        ].join("\n"),
      },
      {
        role: "user",
        content: `User message: ${message}\n\nDataset summary:\n${JSON.stringify(datasetSummary || {})}\n\nReturn JSON only.`,
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI decision response.");
  return parseJson(content);
}
