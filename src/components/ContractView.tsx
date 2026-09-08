import { useRef, useEffect, useState, useCallback } from "react";
import { FileText, CheckCircle, Loader2, Trash2, Check, AlertCircle, ChevronDown, Pen } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import workerCode from "pdfjs-dist/build/pdf.worker.min.mjs?raw";

pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(
  new Blob([workerCode], { type: "application/javascript" })
);

interface ContractViewProps {
  onSign: (signatureData: string) => void;
  signatureData?: string;
  studentName?: string;
  readOnly?: boolean;
}

export default function ContractView({ onSign, signatureData, studentName, readOnly }: ContractViewProps) {
  const [localSignature, setLocalSignature] = useState(signatureData || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [padKey, setPadKey] = useState(0);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [totalPages, setTotalPages] = useState(0);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const lastPageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const sigPreviewRef = useRef<HTMLCanvasElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const points = useRef<{ x: number; y: number }[]>([]);
  const strokes = useRef<{ x: number; y: number }[][]>([]);
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const VIEW_SCALE = 1.5;

  // Signature pad dimensions
  const SIG_PAD_WIDTH = 400;
  const SIG_PAD_HEIGHT = 150;

  // Render ALL pages of the PDF
  useEffect(() => {
    let cancelled = false;
    let pdfLoadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    let currentRenderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderPdf() {
      try {
        const resp = await fetch("/doc/contrat_exacademy.pdf");
        const buffer = await resp.arrayBuffer();
        if (cancelled) return;

        // Store the loading task so we can destroy it on cleanup
        pdfLoadingTask = pdfjsLib.getDocument({ data: buffer });
        const pdf = await pdfLoadingTask.promise;
        if (cancelled) return;

        setTotalPages(pdf.numPages);
        const container = pdfContainerRef.current;
        if (!container) return;

        // Clear previous canvases
        container.innerHTML = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: VIEW_SCALE });

          const wrapper = document.createElement("div");
          wrapper.style.position = "relative";
          wrapper.style.width = "100%";
          wrapper.style.maxWidth = `${viewport.width}px`;

          if (i < pdf.numPages) {
            wrapper.style.marginBottom = "12px";
          }

          const canvas = document.createElement("canvas");
          canvas.width = viewport.width * dpr;
          canvas.height = viewport.height * dpr;
          // Use CSS to make the canvas scale responsively
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";
          canvas.className = "shadow-sm";

          const ctx = canvas.getContext("2d");
          if (!ctx) continue;
          ctx.scale(dpr, dpr);

          // Guard before starting render — component may have unmounted
          if (cancelled) return;

          // Store the render task so we can cancel it on cleanup
          currentRenderTask = page.render({
            canvas,
            canvasContext: ctx,
            viewport,
          });
          try {
            await currentRenderTask.promise;
          } catch (renderErr: any) {
            // RenderingCancelledException or unmount cancellation - ignore gracefully
            if (cancelled || renderErr?.name === "RenderingCancelledException") return;
            throw renderErr;
          } finally {
            currentRenderTask = null;
          }

          if (cancelled) return;

          wrapper.appendChild(canvas);
          container.appendChild(wrapper);

          // Keep reference to the last page wrapper for the signature overlay
          if (i === pdf.numPages) {
            // @ts-ignore - we'll cast this where it's used
            lastPageCanvasRef.current = wrapper;

            // Store original unscaled PDF dimensions for percentage-based positioning
            const unscaledViewport = page.getViewport({ scale: 1 });
            wrapper.dataset.pdfWidth = unscaledViewport.width.toString();
            wrapper.dataset.pdfHeight = unscaledViewport.height.toString();
          }
        }

        if (!cancelled) setLoading(false);
      } catch (e) {
        if (!cancelled) {
          console.error("PDF load error:", e);
          setError("Impossible de charger le contrat. Veuillez réessayer.");
          setLoading(false);
        }
      }
    }

    renderPdf();

    return () => {
      // Mark as cancelled first so that any in-flight catch blocks exit silently
      cancelled = true;
      // Cancel the active page render — prevents RenderingCancelledException from surfacing
      currentRenderTask?.cancel();
      // Destroy the PDF loading task if still in progress
      pdfLoadingTask?.destroy();
    };
  }, []);

  // Track scrolling to check if student scrolled to bottom
  useEffect(() => {
    const container = pdfContainerRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 100) {
        setScrolledToBottom(true);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [loading]);

  // Initialize signature pad canvas
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Reset transform before scaling
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (readOnly && signatureData) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, SIG_PAD_WIDTH, SIG_PAD_HEIGHT);
      img.src = signatureData;
    }
  }, [dpr, readOnly, signatureData, padKey]);

  // Draw signature preview on the last page of PDF
  useEffect(() => {
    if (!localSignature || !lastPageCanvasRef.current) return;

    // @ts-ignore - now it's actually the wrapper div
    const wrapper = lastPageCanvasRef.current as HTMLDivElement;
    if (!wrapper) return;

    // Create or update the preview overlay
    let overlay = wrapper.querySelector(".sig-overlay") as HTMLDivElement | null;
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "sig-overlay";
      overlay.style.position = "absolute";
      overlay.style.pointerEvents = "none";
      wrapper.appendChild(overlay);
    }

    // PDF signature zone: x=50, y=80 in PDF coords (bottom-left)
    const sigX = 50;
    const sigY = 80;
    const sigW = 160;
    const sigH = 55;

    const pdfWidth = parseFloat(wrapper.dataset.pdfWidth || "595");
    const pdfHeight = parseFloat(wrapper.dataset.pdfHeight || "842");

    // Convert to percentages
    const leftPct = (sigX / pdfWidth) * 100;
    const bottomPct = (sigY / pdfHeight) * 100;
    const widthPct = (sigW / pdfWidth) * 100;
    const heightPct = (sigH / pdfHeight) * 100;

    overlay.style.left = `${leftPct}%`;
    overlay.style.bottom = `${bottomPct}%`;
    overlay.style.width = `${widthPct}%`;
    overlay.style.height = `${heightPct}%`;

    const img = new Image();
    img.onload = () => {
      overlay!.innerHTML = "";
      const imgEl = document.createElement("img");
      imgEl.src = localSignature;
      imgEl.style.width = "100%";
      imgEl.style.height = "100%";
      imgEl.style.objectFit = "contain";
      overlay!.appendChild(imgEl);
    };
    img.src = localSignature;

    return () => {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    };
  }, [localSignature, loading]);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) / (rect.width / SIG_PAD_WIDTH),
      y: (clientY - rect.top) / (rect.height / SIG_PAD_HEIGHT),
    };
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIG_PAD_WIDTH, SIG_PAD_HEIGHT);

    const allStrokes = [...strokes.current];
    if (points.current.length >= 2) {
      allStrokes.push(points.current);
    }

    for (const stroke of allStrokes) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      if (stroke.length === 2) {
        ctx.lineTo(stroke[1].x, stroke[1].y);
      } else {
        for (let i = 1; i < stroke.length - 1; i++) {
          const midX = (stroke[i].x + stroke[i + 1].x) / 2;
          const midY = (stroke[i].y + stroke[i + 1].y) / 2;
          ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, midX, midY);
        }
        ctx.lineTo(stroke[stroke.length - 1].x, stroke[stroke.length - 1].y);
      }
      ctx.stroke();
    }
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    setIsDrawing(true);
    setHasDrawn(true);
    points.current = [pos];
    lastPos.current = pos;
  }, [readOnly, getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const pos = getPos(e);
    if (!pos) return;
    points.current.push(pos);
    lastPos.current = pos;
    redrawAll();
  }, [isDrawing, readOnly, getPos, redrawAll]);

  const endDraw = useCallback(() => {
    if (isDrawing && points.current.length >= 2) {
      strokes.current.push([...points.current]);
    }
    setIsDrawing(false);
    points.current = [];
    lastPos.current = null;
  }, [isDrawing]);

  const clear = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIG_PAD_WIDTH, SIG_PAD_HEIGHT);
    setHasDrawn(false);
    points.current = [];
    strokes.current = [];
  }, []);

  const confirmSignature = useCallback(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    setLocalSignature(dataUrl);
    onSign(dataUrl);
    setHasDrawn(false);
    points.current = [];
    strokes.current = [];
  }, [onSign]);

  const resetSignature = useCallback(() => {
    setLocalSignature("");
    onSign("");
    setPadKey(k => k + 1);
    clear();
  }, [onSign, clear]);

  const fullName = studentName || "l'étudiant";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <FileText size={20} className="text-[#0056B3]" />
        <h2 className="text-xl font-black text-gray-900">Contrat de formation</h2>
      </div>

      {/* Instructions */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        {localSignature && !readOnly ? (
          <span className="flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600 shrink-0" />
            Vous avez signé électroniquement. Votre signature a été apposée sur le contrat dans la zone « Signature du candidat ».
          </span>
        ) : (
          <span>
            📋 Veuillez lire <strong>attentivement</strong> le contrat ci-dessous en le faisant défiler jusqu'en bas, puis apposez votre signature dans le pad dédié.
          </span>
        )}
      </div>

      {/* PDF Viewer - All pages, scrollable */}
      <div className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="font-semibold text-gray-700 text-sm flex items-center gap-2">
            <FileText size={16} className="text-gray-400" />
            contrat_exacademy.pdf
            {totalPages > 0 && <span className="text-xs text-gray-400">({totalPages} pages)</span>}
            {localSignature && <span className="text-green-600 text-xs font-bold ml-2 flex items-center gap-1"><CheckCircle size={12} /> Signé</span>}
          </span>
          {!scrolledToBottom && !readOnly && !localSignature && !loading && (
            <span className="text-xs text-amber-600 font-medium flex items-center gap-1 animate-pulse">
              <ChevronDown size={14} /> Faites défiler pour lire le contrat
            </span>
          )}
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center h-[400px] bg-gray-50 gap-3">
            <Loader2 className="animate-spin text-[#0056B3]" size={32} />
            <span className="text-sm text-gray-500">Chargement du contrat...</span>
          </div>
        )}

        {error && !loading && (
          <div className="flex items-center justify-center h-[400px] bg-gray-50">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle size={20} />
              <span className="text-sm font-semibold">{error}</span>
            </div>
          </div>
        )}

        <div
          className="bg-gray-100 overflow-auto p-4 flex justify-center relative"
          style={{ maxHeight: "500px", display: (loading || error) ? "none" : "flex" }}
        >
          <div ref={pdfContainerRef} className="flex flex-col items-center w-full" />
        </div>
      </div>

      {/* Signature Pad Section */}
      {!readOnly && !localSignature && (
        <div
          className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden"
          style={{
            opacity: scrolledToBottom || readOnly ? 1 : 0.5,
            pointerEvents: scrolledToBottom || readOnly ? "auto" : "none",
            transition: "opacity 0.3s ease",
          }}
        >
          <div className="bg-linear-to-r from-[#0056B3]/5 to-[#0056B3]/10 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Pen size={16} className="text-[#0056B3]" />
              <span className="font-bold text-gray-800 text-sm">
                Signature du candidat — {fullName}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Dessinez votre signature dans le cadre ci-dessous. Elle sera apposée en bas à gauche de la dernière page du contrat.
            </p>
          </div>

          <div className="p-4 flex flex-col items-center gap-4">
            {/* Signature Canvas */}
            <div className="relative w-full flex justify-center">
              <div
                className="relative border-2 border-dashed border-[#0056B3]/40 rounded-xl bg-white overflow-hidden"
                style={{
                  width: "min(100%, 400px)",
                  aspectRatio: `${SIG_PAD_WIDTH} / ${SIG_PAD_HEIGHT}`,
                }}
              >
                <canvas
                  key={padKey}
                  ref={sigCanvasRef}
                  width={SIG_PAD_WIDTH * dpr}
                  height={SIG_PAD_HEIGHT * dpr}
                  style={{ width: "100%", height: "100%" }}
                  className="block touch-none cursor-crosshair"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
                    <Pen size={20} className="text-gray-300" />
                    <span className="text-xs text-gray-400 font-medium">
                      Signez ici avec votre souris ou votre doigt
                    </span>
                  </div>
                )}

                {/* Baseline */}
                <div
                  className="absolute left-4 right-4 pointer-events-none"
                  style={{ bottom: "25%" }}
                >
                  <div className="border-b border-gray-200" />
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 w-full justify-center">
              {hasDrawn && (
                <>
                  <button
                    type="button"
                    onClick={clear}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs text-red-500 hover:text-red-700 font-semibold border-2 border-red-100 hover:border-red-200 rounded-lg transition-all"
                  >
                    <Trash2 size={14} /> Effacer
                  </button>
                  <button
                    type="button"
                    onClick={confirmSignature}
                    className="flex items-center gap-1.5 px-6 py-2.5 bg-[#0056B3] text-white text-sm font-bold rounded-lg hover:bg-[#003375] transition-all shadow-md hover:shadow-lg"
                  >
                    <Check size={16} /> Confirmer ma signature
                  </button>
                </>
              )}
            </div>

            {!scrolledToBottom && (
              <p className="text-xs text-amber-600 text-center font-medium">
                ⬆️ Veuillez d'abord faire défiler et lire le contrat entièrement.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Signature Confirmed */}
      {localSignature && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={20} className="text-green-600" />
            <span className="font-bold text-green-800">Contrat signé électroniquement</span>
          </div>
          <p className="text-green-700 text-sm mb-4">
            Signé par <strong>{fullName}</strong> — Votre signature est apposée dans la zone « Signature du candidat » en bas à gauche de la dernière page du contrat.
          </p>
          <div className="flex items-center gap-4">
            <div className="bg-white rounded-xl p-3 border border-green-200 inline-block shadow-sm">
              <img src={localSignature} alt="Votre signature" className="h-14 max-w-[200px] object-contain" />
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={resetSignature}
                className="flex items-center gap-1.5 text-xs text-red-500 font-semibold hover:underline"
              >
                <Trash2 size={14} /> Recommencer la signature
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden canvas for preview (used by the overlay effect) */}
      <canvas ref={sigPreviewRef} style={{ display: "none" }} />
    </div>
  );
}

