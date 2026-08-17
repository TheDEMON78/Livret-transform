const { PDFDocument } = PDFLib;

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const fileInfo = document.getElementById("file-info");
const fileNameEl = document.getElementById("file-name");
const pageSummaryEl = document.getElementById("page-summary");
const convertBtn = document.getElementById("convert-btn");
const resetBtn = document.getElementById("reset-btn");
const progressEl = document.getElementById("progress");
const resultEl = document.getElementById("result");
const downloadLink = document.getElementById("download-link");
const errorEl = document.getElementById("error");

let selectedFile = null;

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) handleFile(file);
});

resetBtn.addEventListener("click", resetUI);

convertBtn.addEventListener("click", async () => {
  if (!selectedFile) return;
  hide(errorEl);
  hide(resultEl);
  show(progressEl);
  convertBtn.disabled = true;

  try {
    const bytes = await selectedFile.arrayBuffer();
    const bookletBytes = await buildBooklet(bytes);
    const blob = new Blob([bookletBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = bookletName(selectedFile.name);
    hide(progressEl);
    show(resultEl);
  } catch (err) {
    console.error(err);
    hide(progressEl);
    showError("Impossible de convertir ce PDF : " + err.message);
  } finally {
    convertBtn.disabled = false;
  }
});

async function handleFile(file) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    showError("Merci de choisir un fichier PDF.");
    return;
  }
  hide(errorEl);
  hide(resultEl);
  selectedFile = file;
  fileNameEl.textContent = file.name;

  try {
    const bytes = await file.arrayBuffer();
    const doc = await PDFDocument.load(bytes);
    const n = doc.getPageCount();
    const sheets = Math.ceil(n / 4);
    const blanks = sheets * 4 - n;
    pageSummaryEl.textContent =
      `${n} page${n > 1 ? "s" : ""} A4 → ${sheets} feuille${sheets > 1 ? "s" : ""} A4 ` +
      `imprimée${sheets > 1 ? "s" : ""} recto-verso` +
      (blanks > 0 ? ` (+ ${blanks} page${blanks > 1 ? "s" : ""} blanche${blanks > 1 ? "s" : ""} ajoutée${blanks > 1 ? "s" : ""})` : "");
    hide(dropZone);
    show(fileInfo);
  } catch (err) {
    console.error(err);
    showError("Ce fichier ne semble pas être un PDF valide.");
  }
}

function resetUI() {
  selectedFile = null;
  fileInput.value = "";
  hide(fileInfo);
  hide(resultEl);
  hide(progressEl);
  hide(errorEl);
  show(dropZone);
}

function bookletName(originalName) {
  const base = originalName.replace(/\.pdf$/i, "");
  return `${base} - Brochure A5.pdf`;
}

function showError(message) {
  errorEl.textContent = message;
  show(errorEl);
}

function show(el) {
  el.classList.remove("hidden");
}

function hide(el) {
  el.classList.add("hidden");
}

/**
 * Builds a saddle-stitch A5 booklet from an A4 source PDF.
 * Each output page is an A4-landscape sheet holding two A5 halves,
 * imposed so that folding + stapling the printed stack in half
 * restores the original reading order (front then back per sheet).
 */
async function buildBooklet(sourceBytes) {
  const srcDoc = await PDFDocument.load(sourceBytes);

  const firstPage = srcDoc.getPage(0);
  const pageWidth = firstPage.getWidth();
  const pageHeight = firstPage.getHeight();

  const remainder = srcDoc.getPageCount() % 4;
  const blanksNeeded = remainder === 0 ? 0 : 4 - remainder;
  for (let i = 0; i < blanksNeeded; i++) {
    srcDoc.addPage([pageWidth, pageHeight]);
  }

  const n = srcDoc.getPageCount();
  const sheets = n / 4;

  const outDoc = await PDFDocument.create();
  const embeddedPages = await outDoc.embedPages(srcDoc.getPages());

  const sheetWidth = pageWidth * 2;
  const sheetHeight = pageHeight;

  for (let i = 1; i <= sheets; i++) {
    const frontLeft = n - (2 * i - 2);
    const frontRight = 2 * i - 1;
    const backLeft = 2 * i;
    const backRight = n - (2 * i - 1);

    drawSheet(outDoc, embeddedPages, frontLeft, frontRight, sheetWidth, sheetHeight, pageWidth);
    drawSheet(outDoc, embeddedPages, backLeft, backRight, sheetWidth, sheetHeight, pageWidth);
  }

  return outDoc.save();
}

function drawSheet(outDoc, embeddedPages, leftPageNum, rightPageNum, sheetWidth, sheetHeight, halfWidth) {
  const page = outDoc.addPage([sheetWidth, sheetHeight]);
  const leftEP = embeddedPages[leftPageNum - 1];
  const rightEP = embeddedPages[rightPageNum - 1];

  page.drawPage(leftEP, { x: 0, y: 0, width: halfWidth, height: sheetHeight });
  page.drawPage(rightEP, { x: halfWidth, y: 0, width: halfWidth, height: sheetHeight });
}
