const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const LM_STUDIO_URL = "http://192.168.1.7:1234/v1/chat/completions";

const SYSTEM_PROMPT =
  "You are Blood Hive AI, a helpful, concise medical logistics assistant. Help users understand blood donation requirements, eligibility rules, and platform usage. Keep answers under 3 sentences.";

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    const response = await fetch(LM_STUDIO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local-model",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    console.log("LM Studio response:", JSON.stringify(data));

    const text =
      data.choices?.[0]?.message?.content ?? "Sorry, I couldn\'t process that right now.";

    res.json({ text });
  } catch (err) {
    console.error("LM Studio error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Blood Hive AI proxy running on port 3000");
});