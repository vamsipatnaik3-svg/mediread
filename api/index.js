require("dotenv").config();
const express = require("express");
const multer = require("multer");
const PDFDocument = require("pdfkit");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

// -----------------------------
// 🧠 Configure Google Gemini
// -----------------------------
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// -----------------------------
// 📸 Multer Memory Storage
// -----------------------------
const upload = multer({ storage: multer.memoryStorage() });

// -----------------------------
// ⚙️ Express Middleware
// -----------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.static("public")); // Serve frontend files

// Serve index.html on root
app.get("/", (req, res) => {
  res.sendFile("index.html", { root: "public" });
});

// -----------------------------
// 🧾 Analyze Prescription Route
// -----------------------------
app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No prescription image uploaded" });
    }

    const imageData = req.file.buffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      You are a medical assistant AI. Analyze the uploaded doctor’s handwritten prescription image carefully and provide:
      1. The list of medicines mentioned (correctly spelled if handwriting is unclear).
      2. The dosage for each medicine (e.g., 1 tablet 3 times a day after food).
      3. The purpose or use of each medicine (e.g., for fever, for pain, for infection, etc.).
      4. If dosage or name is unclear, mention "Not clearly readable" and give your best guess.
      5. Respond in clear plain text, structured as:

      Medicine Name:
      Dosage:
      Purpose:

      Repeat for all medicines. No markdown, no symbols.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: req.file.mimetype,
          data: imageData,
        },
      },
    ]);

    const analysis = result.response.text();

    res.json({
      result: analysis,
      image: `data:${req.file.mimetype};base64,${imageData}`,
    });
  } catch (error) {
    console.error("Error analyzing prescription:", error);
    res.status(500).json({
      error: "An error occurred while analyzing the prescription. " + error.message,
    });
  }
});

// -----------------------------
// 📄 PDF Download Route (In-Memory)
// -----------------------------
app.post("/download", express.json(), async (req, res) => {
  const { result, image } = req.body;

  try {
    const doc = new PDFDocument();
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=prescription_report_${Date.now()}.pdf`
      );
      res.send(pdfData);
    });

    // PDF Content
    doc.fontSize(24).text("Prescription Analysis Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);
    doc.fontSize(14).text(result || "No analysis text provided.", { align: "left" });

    // Add image if provided
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      doc.addPage();
      doc.image(buffer, { fit: [500, 300], align: "center", valign: "center" });
    }

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({ error: "An error occurred while generating the PDF." });
  }
});

// -----------------------------
// 🚀 Start Server
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ MediRead server running on port ${PORT}...`));

module.exports = app; // for Vercel serverless
