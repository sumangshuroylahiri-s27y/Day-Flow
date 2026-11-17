import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Download, FileUp, Info, Scissors, Merge, Image as ImageIcon } from 'lucide-react';
import { useDayflow } from '../../../context/DayflowContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

function downloadBytes(bytes: Uint8Array, filename: string, mime: string) {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function DocumentUtilitiesPanel() {
  const { pushToast } = useDayflow();

  // Merge PDFs
  const [mergeFiles, setMergeFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  // Split PDF
  const [splitFile, setSplitFile] = useState<File | null>(null);
  const [splitPageCount, setSplitPageCount] = useState(0);
  const [pageStart, setPageStart] = useState(1);
  const [pageEnd, setPageEnd] = useState(1);

  // PDF to Image
  const [pdfImgFile, setPdfImgFile] = useState<File | null>(null);
  const [renderedImages, setRenderedImages] = useState<Array<{ page: number; dataUrl: string }>>([]);

  // Image to PDF
  const [imgFiles, setImgFiles] = useState<File[]>([]);

  // Text/Markdown converter
  const [docSource, setDocSource] = useState('# Document Title\n\nPaste Markdown or CSV content to convert.');
  const [docTargetFormat, setDocTargetFormat] = useState<'html' | 'txt' | 'json'>('html');

  const handleMergePdfs = async () => {
    if (mergeFiles.length < 2) {
      pushToast({ title: 'Select at least 2 PDF files to merge', variant: 'warning' });
      return;
    }
    setBusy(true);
    try {
      const merged = await PDFDocument.create();
      for (const f of mergeFiles) {
        const bytes = await f.arrayBuffer();
        const doc = await PDFDocument.load(bytes);
        const copied = await merged.copyPages(doc, doc.getPageIndices());
        copied.forEach((p) => merged.addPage(p));
      }
      const out = await merged.save();
      downloadBytes(out, 'dayflow-merged.pdf', 'application/pdf');
      pushToast({ title: 'PDFs merged successfully', variant: 'success' });
    } catch (err) {
      pushToast({
        title: 'Merge failed',
        description: err instanceof Error ? err.message : 'Ensure all selected files are valid unencrypted PDFs.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSelectSplitPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSplitFile(file);
    try {
      const doc = await PDFDocument.load(await file.arrayBuffer());
      const count = doc.getPageCount();
      setSplitPageCount(count);
      setPageStart(1);
      setPageEnd(count);
    } catch {
      pushToast({ title: 'Unable to read PDF page count', variant: 'error' });
    }
  };

  const handleSplitPdf = async () => {
    if (!splitFile) return;
    setBusy(true);
    try {
      const src = await PDFDocument.load(await splitFile.arrayBuffer());
      const total = src.getPageCount();
      const s = Math.max(1, Math.min(total, pageStart));
      const e = Math.max(s, Math.min(total, pageEnd));
      const outDoc = await PDFDocument.create();
      const indices = Array.from({ length: e - s + 1 }, (_, i) => s - 1 + i);
      const pages = await outDoc.copyPages(src, indices);
      pages.forEach((p) => outDoc.addPage(p));
      const out = await outDoc.save();
      downloadBytes(out, `dayflow-pages-${s}-to-${e}.pdf`, 'application/pdf');
      pushToast({ title: `Extracted pages ${s}–${e}`, variant: 'success' });
    } catch (err) {
      pushToast({
        title: 'Split failed',
        description: err instanceof Error ? err.message : 'Invalid PDF file.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handlePdfToImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfImgFile(file);
    setBusy(true);
    setRenderedImages([]);
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const limit = Math.min(pdf.numPages, 10);
      const imgs: Array<{ page: number; dataUrl: string }> = [];
      for (let i = 1; i <= limit; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
          imgs.push({ page: i, dataUrl: canvas.toDataURL('image/png') });
        }
      }
      setRenderedImages(imgs);
      pushToast({ title: `Rendered ${imgs.length} page(s) to PNG`, variant: 'success' });
    } catch (err) {
      pushToast({
        title: 'PDF rendering failed',
        description: err instanceof Error ? err.message : 'Unable to render PDF pages.',
        variant: 'error',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImageToPdf = async () => {
    if (imgFiles.length === 0) return;
    setBusy(true);
    try {
      const pdf = await PDFDocument.create();
      for (const file of imgFiles) {
        const bytes = await file.arrayBuffer();
        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
        const isJpg =
          file.type === 'image/jpeg' ||
          file.name.toLowerCase().endsWith('.jpg') ||
          file.name.toLowerCase().endsWith('.jpeg');
        if (!isPng && !isJpg) {
          pushToast({
            title: `Unsupported image: ${file.name}`,
            description: 'Only PNG and JPEG images are supported for Image-to-PDF.',
            variant: 'warning',
          });
          continue;
        }
        const embedded = isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const page = pdf.addPage([embedded.width, embedded.height]);
        page.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
      }
      if (pdf.getPageCount() > 0) {
        const out = await pdf.save();
        downloadBytes(out, 'dayflow-images.pdf', 'application/pdf');
        pushToast({ title: 'Image PDF created', variant: 'success' });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConvertTextDoc = () => {
    let out = docSource;
    let ext = 'txt';
    let mime = 'text/plain;charset=utf-8';
    if (docTargetFormat === 'html') {
      const htmlLines = docSource
        .split('\n')
        .map((line) => {
          if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
          if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
          if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
          return `<p>${line}</p>`;
        })
        .join('\n');
      out = `<!doctype html><html><body style="font-family:sans-serif;padding:24px;">\n${htmlLines}\n</body></html>`;
      ext = 'html';
      mime = 'text/html;charset=utf-8';
    } else if (docTargetFormat === 'json') {
      out = JSON.stringify({ lines: docSource.split('\n') }, null, 2);
      ext = 'json';
      mime = 'application/json;charset=utf-8';
    }
    const blob = new Blob([out], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dayflow-converted.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#60A5FA]/30 bg-[#60A5FA]/5 p-4 flex items-start gap-3 text-xs text-slate-700 dark:text-[#94A3B8]">
        <Info className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-slate-900 dark:text-[#F8FAFC]">
            Supported Formats & Local Processing
          </p>
          <p className="mt-0.5">
            PDF Merge, PDF Split, PDF-to-PNG (first 10 pages), and PNG/JPG-to-PDF run locally in your browser without uploading files. Proprietary binary formats such as <code>.docx</code>, <code>.xlsx</code>, and password-encrypted PDFs are not supported for offline conversion.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PDF Merger */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Merge className="w-4 h-4 text-[#8B7CFF]" />
            <h3 className="font-display font-semibold text-base">PDF Merger</h3>
          </div>
          <label className="block border border-dashed border-slate-300 dark:border-white/15 rounded-lg p-4 text-center text-xs text-slate-500 cursor-pointer hover:border-[#8B7CFF]">
            <FileUp className="w-5 h-5 mx-auto mb-1 text-[#8B7CFF]" />
            <span>Select 2 or more PDF files</span>
            <input
              type="file"
              accept="application/pdf"
              multiple
              onChange={(e) => setMergeFiles(Array.from(e.target.files || []))}
              className="hidden"
            />
          </label>
          {mergeFiles.length > 0 && (
            <p className="text-xs text-slate-500 font-mono-tabular">
              {mergeFiles.length} file(s): {mergeFiles.map((f) => f.name).join(', ')}
            </p>
          )}
          <button
            type="button"
            disabled={busy || mergeFiles.length < 2}
            onClick={handleMergePdfs}
            className="w-full py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            Merge & Download PDF
          </button>
        </div>

        {/* PDF Splitter */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#60A5FA]" />
            <h3 className="font-display font-semibold text-base">PDF Splitter</h3>
          </div>
          <label className="block border border-dashed border-slate-300 dark:border-white/15 rounded-lg p-4 text-center text-xs text-slate-500 cursor-pointer hover:border-[#8B7CFF]">
            <FileUp className="w-5 h-5 mx-auto mb-1 text-[#60A5FA]" />
            <span>{splitFile ? `${splitFile.name} (${splitPageCount} pages)` : 'Choose a PDF file'}</span>
            <input type="file" accept="application/pdf" onChange={handleSelectSplitPdf} className="hidden" />
          </label>
          {splitPageCount > 0 && (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">From Page</label>
                <input
                  type="number"
                  min={1}
                  max={splitPageCount}
                  value={pageStart}
                  onChange={(e) => setPageStart(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">To Page</label>
                <input
                  type="number"
                  min={1}
                  max={splitPageCount}
                  value={pageEnd}
                  onChange={(e) => setPageEnd(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620] font-mono-tabular"
                />
              </div>
            </div>
          )}
          <button
            type="button"
            disabled={busy || !splitFile}
            onClick={handleSplitPdf}
            className="w-full py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            Extract Page Range
          </button>
        </div>

        {/* PDF to Image */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#34D399]" />
            <h3 className="font-display font-semibold text-base">PDF to PNG Images</h3>
          </div>
          <label className="block border border-dashed border-slate-300 dark:border-white/15 rounded-lg p-4 text-center text-xs text-slate-500 cursor-pointer hover:border-[#8B7CFF]">
            <FileUp className="w-5 h-5 mx-auto mb-1 text-[#34D399]" />
            <span>{pdfImgFile ? pdfImgFile.name : 'Select PDF to render pages'}</span>
            <input type="file" accept="application/pdf" onChange={handlePdfToImage} className="hidden" />
          </label>
          {renderedImages.length > 0 && (
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {renderedImages.map((img) => (
                <a
                  key={img.page}
                  href={img.dataUrl}
                  download={`page-${img.page}.png`}
                  className="block rounded-lg border border-slate-200 dark:border-white/10 overflow-hidden group"
                >
                  <img src={img.dataUrl} alt={`Page ${img.page}`} className="w-full h-24 object-cover" />
                  <div className="px-2 py-1 text-[11px] flex items-center justify-between bg-slate-50 dark:bg-[#121620]">
                    <span>Page {img.page}</span>
                    <Download className="w-3 h-3 text-[#8B7CFF]" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Image to PDF */}
        <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#FBBF24]" />
            <h3 className="font-display font-semibold text-base">Image to PDF</h3>
          </div>
          <label className="block border border-dashed border-slate-300 dark:border-white/15 rounded-lg p-4 text-center text-xs text-slate-500 cursor-pointer hover:border-[#8B7CFF]">
            <FileUp className="w-5 h-5 mx-auto mb-1 text-[#FBBF24]" />
            <span>Select PNG or JPEG images</span>
            <input
              type="file"
              accept="image/png,image/jpeg"
              multiple
              onChange={(e) => setImgFiles(Array.from(e.target.files || []))}
              className="hidden"
            />
          </label>
          {imgFiles.length > 0 && (
            <p className="text-xs text-slate-500 font-mono-tabular">
              {imgFiles.length} image(s) queued
            </p>
          )}
          <button
            type="button"
            disabled={busy || imgFiles.length === 0}
            onClick={handleImageToPdf}
            className="w-full py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A69F5] text-white text-xs font-medium disabled:opacity-50 cursor-pointer"
          >
            Convert Images to PDF
          </button>
        </div>
      </div>

      {/* Text/Markdown Basic Document Converter */}
      <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#171D29] p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display font-semibold text-base">Markdown / Text Document Converter</h3>
          <div className="flex items-center gap-2">
            <select
              value={docTargetFormat}
              onChange={(e) => setDocTargetFormat(e.target.value as 'html' | 'txt' | 'json')}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
            >
              <option value="html">Export as HTML</option>
              <option value="txt">Export as Plain Text (.txt)</option>
              <option value="json">Export as JSON Lines</option>
            </select>
            <button
              type="button"
              onClick={handleConvertTextDoc}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#8B7CFF] text-white text-xs font-medium cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Convert & Download
            </button>
          </div>
        </div>
        <textarea
          rows={4}
          value={docSource}
          onChange={(e) => setDocSource(e.target.value)}
          className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#121620]"
        />
      </div>
    </div>
  );
}
