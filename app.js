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
const marginOuterInput = document.getElementById("margin-outer");
const marginGutterInput = document.getElementById("margin-gutter");
const marginTopInput = document.getElementById("margin-top");
const marginBottomInput = document.getElementById("margin-bottom");

const MM_TO_PT = 2.834645669;

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
    const margins = {
      outerMm: parseMargin(marginOuterInput.value),
      gutterMm: parseMargin(marginGutterInput.value),
      topMm: parseMargin(marginTopInput.value),
      bottomMm: parseMargin(marginBottomInput.value),
    };
    const bookletBytes = await buildBooklet(bytes, margins);
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

function parseMargin(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
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
async function buildBooklet(sourceBytes, margins = {}) {
  const { outerMm = 0, gutterMm = 0, topMm = 0, bottomMm = 0 } = margins;
  const srcDoc = await PDFDocument.load(sourceBytes);

  const firstPage = srcDoc.getPage(0);
  const pageWidth = firstPage.getWidth();
  const pageHeight = firstPage.getHeight();

  const remainder = srcDoc.getPageCount() % 4;
  const blanksNeeded = remainder === 0 ? 0 : 4 - remainder;
  for (let i = 0; i < blanksNeeded; i++) {
    srcDoc.addPage([pageWidth, pageHeight]);
  }

  // Some PDFs (often from scanners) contain pages with no content stream
  // at all, which pdf-lib refuses to embed ("missing Contents"). Drawing
  // a zero-size shape forces pdf-lib to create an (empty) content stream
  // without changing what the page looks like.
  for (const page of srcDoc.getPages()) {
    page.drawRectangle({ x: 0, y: 0, width: 0, height: 0 });
  }

  const n = srcDoc.getPageCount();
  const sheets = n / 4;

  const outDoc = await PDFDocument.create();
  const embeddedPages = await outDoc.embedPages(srcDoc.getPages());

  const sheetWidth = pageWidth * 2;
  const sheetHeight = pageHeight;
  const pt = {
    outer: outerMm * MM_TO_PT,
    gutter: gutterMm * MM_TO_PT,
    top: topMm * MM_TO_PT,
    bottom: bottomMm * MM_TO_PT,
  };

  for (let i = 1; i <= sheets; i++) {
    const frontLeft = n - (2 * i - 2);
    const frontRight = 2 * i - 1;
    const backLeft = 2 * i;
    const backRight = n - (2 * i - 1);

    drawSheet(outDoc, embeddedPages, frontLeft, frontRight, sheetWidth, sheetHeight, pageWidth, pt);
    drawSheet(outDoc, embeddedPages, backLeft, backRight, sheetWidth, sheetHeight, pageWidth, pt);
  }

  return outDoc.save();
}

function drawSheet(outDoc, embeddedPages, leftPageNum, rightPageNum, sheetWidth, sheetHeight, halfWidth, pt) {
  const page = outDoc.addPage([sheetWidth, sheetHeight]);
  const leftEP = embeddedPages[leftPageNum - 1];
  const rightEP = embeddedPages[rightPageNum - 1];

  const boxHeight = sheetHeight - pt.top - pt.bottom;
  const boxWidth = halfWidth - pt.outer - pt.gutter;

  // Left half: gutter (fold) is on its right edge, outer margin on its left edge.
  drawInFittedBox(page, leftEP, pt.outer, pt.bottom, boxWidth, boxHeight);

  // Right half: gutter (fold) is on its left edge, outer margin on its right edge.
  drawInFittedBox(page, rightEP, halfWidth + pt.gutter, pt.bottom, boxWidth, boxHeight);
}

function drawInFittedBox(page, embeddedPage, boxX, boxY, boxWidth, boxHeight) {
  const safeWidth = Math.max(boxWidth, 1);
  const safeHeight = Math.max(boxHeight, 1);
  const scale = Math.min(safeWidth / embeddedPage.width, safeHeight / embeddedPage.height);
  const drawWidth = embeddedPage.width * scale;
  const drawHeight = embeddedPage.height * scale;
  const x = boxX + (safeWidth - drawWidth) / 2;
  const y = boxY + (safeHeight - drawHeight) / 2;

  page.drawPage(embeddedPage, { x, y, width: drawWidth, height: drawHeight });
}
