import { jsPDF } from "jspdf";
import { exportTitles, type ExportKind, type ExportRow } from "./testExport";

export function makePdf(kind: ExportKind, rows: ExportRow[]): Blob {
  const pdf = new jsPDF({ unit: "pt", format: "letter", compress: true });
  const left = 44;
  const width = 524;
  const lineHeight = 15;
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("PDF rendering is unavailable. Try CSV instead.");
  let y = 0;
  let section = "";

  const writeHeader = () => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(exportTitles[kind], left, 45);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Lift Off Exams | Test Mode | Page ${pdf.getNumberOfPages()}`, left, 63);
    pdf.line(left, 72, left + width, 72);
    y = 93;
  };
  const newPage = () => {
    pdf.addPage();
    writeHeader();
    pdf.setFont("helvetica", "bold");
    pdf.text(section + " (continued)", left, y);
    pdf.setFont("helvetica", "normal");
    y += lineHeight + 5;
  };

  writeHeader();
  for (const [nextSection, record, field, value] of rows) {
    if (section !== nextSection) {
      section = nextSection;
      if (y > 716) newPage();
      else {
        pdf.setFont("helvetica", "bold");
        pdf.text(section, left, y);
        pdf.setFont("helvetica", "normal");
        y += lineHeight + 5;
      }
    }
    const prefix = (record ? `${record} / ` : "") + field + ": ";
    for (const paragraph of (prefix + value).split(/\r\n?|\n/u)) {
      if (/^[\x20-\x7e]*$/u.test(paragraph)) {
        for (const line of pdf.splitTextToSize(paragraph, width) as string[]) {
          if (y > 747) newPage();
          pdf.text(line, left, y);
          y += lineHeight;
        }
      } else {
        // Canvas uses the browser's Unicode font fallback where built-in PDF
        // Helvetica cannot encode a glyph. Ordinary text remains selectable.
        context.font = "20px Arial, sans-serif";
        const lines: string[] = [];
        let line = "";
        for (const part of new Intl.Segmenter().segment(paragraph)) {
          if (line && context.measureText(line + part.segment).width > width * 2) {
            lines.push(line);
            line = "";
          }
          line += part.segment;
        }
        if (line) lines.push(line);
        for (const text of lines) {
          if (y > 747) newPage();
          canvas.width = Math.ceil(context.measureText(text).width) + 4;
          canvas.height = 30;
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.font = "20px Arial, sans-serif";
          context.fillStyle = "#182322";
          context.fillText(text, 0, 22);
          pdf.addImage(canvas, "PNG", left, y - 11, canvas.width / 2, 15);
          y += lineHeight;
        }
      }
    }
  }
  return pdf.output("blob");
}
