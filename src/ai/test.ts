import { model } from "./gemini";

async function test() {
  const result = await model.generateContent(
    "Return JSON: {\"hello\": \"world\"}"
  );

  console.log(result.response.text());
}

test();
