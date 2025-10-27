import PDFDocument from "pdfkit";
import { Buffer } from "buffer";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { result, image } = req.body;

    // Create a new PDF document
    const doc = new PDFDocument({ bufferPages: true });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=prescription_report_${Date.now()}.pdf`
      );
      res.status(200).send(pdfData);
    });

    // PDF title
    doc.fontSize(24).text("🩺 Prescription Analysis Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);
    doc.fontSize(14).text(result || "No analysis result found.", { align: "left" });

    // Add image if provided
    if (image) {
      try {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
        const imgBuffer = Buffer.from(base64Data, "base64");
        doc.addPage();
        doc.image(imgBuffer, {
          fit: [450, 300],
          align: "center",
          valign: "center",
        });
      } catch (e) {
        console.error("Error adding image:", e);
      }
    }

    doc.end();
  } catch (error) {
    console.error("Error generating PDF:", error);
    res.status(500).json({
      error: "An error occurred while generating the PDF.",
      details: error.message,
    });
  }
}
