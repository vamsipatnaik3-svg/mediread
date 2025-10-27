import PDFDocument from "pdfkit";

export const config = {
  api: {
    bodyParser: true, // JSON body
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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

    // PDF content
    doc.fontSize(24).text("Prescription Analysis Report", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);
    doc.fontSize(14).text(result || "No analysis provided.");

    // Add image
    if (image) {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      doc.addPage();
      doc.image(buffer, { fit: [500, 300], align: "center", valign: "center" });
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ error: "PDF generation failed: " + error.message });
  }
}
