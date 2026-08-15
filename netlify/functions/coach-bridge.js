const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  "Cache-Control": "no-store"
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(payload)
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };
  }

  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "POST only." });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonResponse(500, {
      error: "OPENAI_API_KEY is not configured in Netlify."
    });
  }

  let payload;

  try {
    payload = JSON.parse(event.body || "{}");
  } catch (_error) {
    return jsonResponse(400, { error: "Invalid request." });
  }

  const attempt =
    typeof payload.attempt === "string"
      ? payload.attempt.trim()
      : typeof payload.prompt === "string"
        ? payload.prompt.trim()
        : "";

  if (!attempt) {
    return jsonResponse(400, { error: "No attempt was provided." });
  }

  if (attempt.length > 12000) {
    return jsonResponse(413, {
      error: "That attempt is too long for this coaching exercise."
    });
  }

  const model = process.env.OPENAI_COACH_MODEL || "gpt-4.1-mini";

  const instructions = [
    "You are the GLAM AI Coach inside a beginner-friendly ChatGPT learning hub.",
    "Give concise, useful coaching on the user's attempt.",
    "Be encouraging but specific.",
    "Focus on clarity, structure, usefulness, and how the prompt could be improved.",
    "Do not rewrite everything unless useful.",
    "Return valid JSON only with these keys:",
    '"headline", "whatWorked", "improve", "betterVersion".',
    "Each value must be a string."
  ].join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions,
        input: attempt,
        text: {
          format: {
            type: "json_schema",
            name: "glam_ai_coach_feedback",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                headline: { type: "string" },
                whatWorked: { type: "string" },
                improve: { type: "string" },
                betterVersion: { type: "string" }
              },
              required: [
                "headline",
                "whatWorked",
                "improve",
                "betterVersion"
              ]
            }
          }
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return jsonResponse(
        response.status >= 500 ? 502 : 500,
        { error: "The AI Coach could not generate feedback right now." }
      );
    }

    const outputText =
      data.output_text ||
      data.output
        ?.flatMap(item => item.content || [])
        ?.find(item => item.type === "output_text")
        ?.text ||
      "";

    if (!outputText) {
      return jsonResponse(502, {
        error: "The AI Coach returned an empty response."
      });
    }

    let coaching;

    try {
      coaching = JSON.parse(outputText);
    } catch (_error) {
      coaching = {
        headline: "Your coaching is ready.",
        whatWorked: outputText,
        improve: "",
        betterVersion: ""
      };
    }

    return jsonResponse(200, coaching);
  } catch (error) {
    console.error("AI Coach bridge error:", error);

    return jsonResponse(500, {
      error: "AI coaching is temporarily unavailable."
    });
  }
};
