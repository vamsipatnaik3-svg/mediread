import multer from "multer";
import { GoogleGenerativeAI } from "@google/generative-ai";

const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const config = {
  api: {
    bodyParser: false, // let multer handle file uploads
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  upload.single("image")(req, res, async (err) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const imageData = req.file.buffer.toString("base64");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = `
        You are a medical assistant AI. Analyze the uploaded prescription image carefully and provide:
        1. List of medicines (correct spelling if unclear)
        2. Dosage
        3. Purpose
        4. If unclear, write "Not clearly readable"
      `;
      const result = await model.generateContent([{ prompt, inlineData: { mimeType: req.file.mimetype, data: imageData } }]);
      res.status(200).json({ result: result.response.text(), image: `data:${req.file.mimetype};base64,${imageData}` });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}
