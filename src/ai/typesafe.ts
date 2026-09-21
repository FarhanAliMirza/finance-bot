import "dotenv/config";
import { choice, TypeSafeClient } from "@typesafe-ai/sdk";
import type { IntentKind } from "../types/intent";

const INTENT_MODEL = process.env.TYPESAFE_INTENT_MODEL || "jev-1.13.0";

const intentQuestion = choice(
  "Which single supported action should the personal expense bot take for `message`? Choose `other` when the message is unclear, conversational, or asks for something outside these capabilities.",
  {
    log: {
      meaning: "Record one new expense the user spent, paid, or bought.",
      excludes:
        "Questions about existing records and corrections to the latest saved expense.",
      examples: ["Spent 150 on coffee", "Movie ticket 250"],
    },
    question: {
      meaning:
        "Read information about the user's spending, budget, payment methods, or recent expenses.",
      excludes:
        "Recording a new expense or changing an existing expense.",
      examples: ["How much did I spend today?", "Show my last 3 expenses"],
    },
    edit_last: {
      meaning:
        "Change or correct a field on the user's latest saved expense, often referred to as it, that, or the last expense.",
      excludes: "Recording a separate new expense.",
      examples: ["Change that to 200", "Make the last one Travel"],
    },
    other: {
      meaning:
        "A greeting, thanks, unsupported request, multiple incompatible actions, or text too unclear to route safely.",
      examples: ["Hello", "Thanks", "Can you recommend a stock?"],
    },
  },
);

let client: TypeSafeClient | undefined;

function getClient() {
  client ??= new TypeSafeClient();
  return client;
}

export type JevIntent = IntentKind | "other";

export interface JevIntentDecision {
  intent: JevIntent;
  confidence: number;
  probabilities: Readonly<Record<JevIntent, number>>;
  model: string;
}

export const INTENT_CONFIDENCE_FLOORS: Readonly<
  Record<IntentKind, number>
> = {
  log: 0.5,
  question: 0.5,
  // An edit writes directly to the database, so require a clearer route.
  edit_last: 0.7,
};

export function acceptedJevIntent(
  decision: Pick<JevIntentDecision, "intent" | "confidence">,
): IntentKind | null {
  if (decision.intent === "other") return null;
  return decision.confidence >= INTENT_CONFIDENCE_FLOORS[decision.intent]
    ? decision.intent
    : null;
}

export async function classifyIntentWithJev(
  message: string,
): Promise<JevIntentDecision> {
  const result = await getClient().systemOne({
    model: INTENT_MODEL,
    state: { message },
    questions: { intent: intentQuestion },
  });
  const answer = result.answers.intent;

  return {
    intent: answer.choice,
    confidence: answer.confidence,
    probabilities: answer.probabilities,
    model: result.model,
  };
}
