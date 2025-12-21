// Export utilities for notes

export function exportToTxt(content: string, filename: string) {
  // Convert HTML to plain text
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = content;
  const plainText = tempDiv.textContent || tempDiv.innerText || "";

  downloadFile(plainText, `${filename}.txt`, "text/plain");
}

export function exportToMarkdown(content: string, filename: string) {
  // Convert HTML to basic markdown
  let markdown = content
    // Bold
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    // Italic
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    // Underline (markdown doesn't have underline, use HTML)
    .replace(/<u>(.*?)<\/u>/gi, "<u>$1</u>")
    // Line breaks
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<p>/gi, "")
    // Lists
    .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<\/?[uo]l>/gi, "")
    // Headers
    .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n")
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, "")
    // Clean up extra newlines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  downloadFile(markdown, `${filename}.md`, "text/markdown");
}

export function exportToHtml(content: string, filename: string, title: string) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${content}</div>
  <footer style="margin-top: 40px; color: #999; font-size: 12px;">
    Exported from FocusNote on ${new Date().toLocaleDateString()}
  </footer>
</body>
</html>`;

  downloadFile(html, `${filename}.html`, "text/html");
}

export async function exportToPdf(content: string, filename: string, title: string) {
  // Create a printable HTML document
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Could not open print window");
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          line-height: 1.6;
        }
        @media print {
          body { margin: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div>${content}</div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  // Wait for content to load then print
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
