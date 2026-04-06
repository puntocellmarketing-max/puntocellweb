import puppeteer from "puppeteer";
import { getExtractoData } from "../getExtractoData";
import { renderExtractoHtml } from "../renderExtractoHtml";

export async function generateExtractoPdf(codCliente: number) {
  const data = await getExtractoData(codCliente);
  const html = renderExtractoHtml(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfUint8 = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12px",
        right: "12px",
        bottom: "12px",
        left: "12px",
      },
    });

    const pdf = Buffer.from(pdfUint8);

    return {
      pdf,
      data,
      fileName: `Extracto_${data.codCliente}.pdf`,
    };
  } finally {
    await browser.close();
  }
}