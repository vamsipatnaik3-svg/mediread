import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Multer in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Required for Vercel serverless
export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  upload.single("image")(req, {}, async (err) => {
    if (err) return res.status(500).json({ error: err.message });

    try {
      if (!req.file) return res.status(400).json({ error: "No prescription image uploaded" });

      const imageData = req.file.buffer.toString("base64");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        You are a medical assistant AI. Analyze the uploaded doctor’s handwritten prescription image carefully and provide:
        1. The list of medicines mentioned.
        2. Dosage for each medicine.
        3. Purpose of each medicine.
        4. If unclear, mention "Not clearly readable".
        5. Respond in plain text, structured as:

        Medicine Name:
        Dosage:
        Purpose:
      `;

      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: req.file.mimetype, data: imageData } },
      ]);

      const analysis = result.response.text();

      res.status(200).json({
        result: analysis,
        image: `data:${req.file.mimetype};base64,${imageData}`,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
}
