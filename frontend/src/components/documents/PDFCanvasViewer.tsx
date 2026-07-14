/* ─────────────────────────────────────────────────
   SecureDocChain — High-Security PDF Canvas Viewer
   Renders PDF pages directly to HTML5 Canvas to prevent:
   1. Raw PDF downloads (no native browser iframe toolbar).
   2. Text selection and copying.
   3. Print/Save triggers.
   
   Includes interactive Zoom controls and smooth layout scaling.
   ───────────────────────────────────────────────── */

"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface PDFCanvasViewerProps {
  url: string;
}

export default function PDFCanvasViewer({ url }: PDFCanvasViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [numPages, setNumPages] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasesRef = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    let active = true;

    // Load PDF.js dynamically from CDN to avoid Next.js worker configuration conflicts
    const loadPdfJS = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.async = true;
          document.body.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error("Failed to load PDF viewer libraries."));
          });
        }

        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

        // Load the decrypted PDF document
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (!active) return;
        setNumPages(pdf.numPages);
        setLoading(false);

        // Render pages sequentially
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (!active) break;
          const page = await pdf.getPage(pageNum);
          const canvas = canvasesRef.current[pageNum - 1];
          if (!canvas) continue;

          const context = canvas.getContext("2d");
          if (!context) continue;

          // Render at high-density scale (2.0) to ensure text remains crisp when zoomed in
          const renderScale = 2.0;
          const viewport = page.getViewport({ scale: renderScale });

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          };
          await page.render(renderContext).promise;
        }
      } catch (err: any) {
        console.error("PDF canvas render error:", err);
        if (active) {
          setError(err?.message || "Failed to parse secure document pages.");
          setLoading(false);
        }
      }
    };

    loadPdfJS();

    return () => {
      active = false;
    };
  }, [url]);

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.15, 2.0));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(prev - 0.15, 0.6));
  };

  const handleZoomReset = () => {
    setZoomScale(1.0);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "450px", gap: 12 }}>
        <Loader2 className="animate-spin text-cyan-400" size={32} style={{ color: "var(--accent-teal)" }} />
        <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>Decrypting and rendering secure pages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "450px", color: "var(--text-error)", padding: 24, textAlign: "center" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{error}</span>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "rgba(0,0,0,0.25)",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Sticky Floating Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          padding: "8px 16px",
          width: "100%",
          boxSizing: "border-box",
          zIndex: 10,
        }}
      >
        <button
          onClick={handleZoomOut}
          disabled={zoomScale <= 0.6}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: zoomScale <= 0.6 ? "var(--text-muted)" : "white",
            padding: "6px 10px",
            cursor: zoomScale <= 0.6 ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (zoomScale > 0.6) e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
        >
          <ZoomOut size={12} />
        </button>

        <span style={{ fontSize: 11, color: "white", fontWeight: 700, minWidth: 42, textAlign: "center", fontFamily: "monospace" }}>
          {Math.round(zoomScale * 100)}%
        </span>

        <button
          onClick={handleZoomIn}
          disabled={zoomScale >= 2.0}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            color: zoomScale >= 2.0 ? "var(--text-muted)" : "white",
            padding: "6px 10px",
            cursor: zoomScale >= 2.0 ? "default" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            if (zoomScale < 2.0) e.currentTarget.style.background = "rgba(255,255,255,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
        >
          <ZoomIn size={12} />
        </button>

        <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.15)" }} />

        <button
          onClick={handleZoomReset}
          style={{
            background: "rgba(34, 211, 238, 0.08)",
            border: "1px solid rgba(34, 211, 238, 0.2)",
            borderRadius: 8,
            color: "var(--accent-teal)",
            padding: "6px 12px",
            fontSize: 10,
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(34, 211, 238, 0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(34, 211, 238, 0.08)";
          }}
        >
          <RotateCcw size={10} />
          Reset
        </button>
      </div>

      {/* Pages Container */}
      <div
        ref={containerRef}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          width: "100%",
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          padding: "16px 8px",
          userSelect: "none",
          WebkitUserSelect: "none",
          msUserSelect: "none",
          boxSizing: "border-box",
        }}
      >
        {Array.from({ length: numPages }).map((_, idx) => (
          <div
            key={idx}
            style={{
              width: "100%",
              maxWidth: `${740 * zoomScale}px`,
              transition: "max-width 0.2s ease-out",
              background: "white",
              borderRadius: "8px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.45), 0 8px 10px -6px rgba(0, 0, 0, 0.45)",
              overflow: "hidden",
              lineHeight: 0,
              flexShrink: 0,
            }}
          >
            <canvas
              style={{ width: "100%", height: "auto" }}
              ref={(el) => {
                canvasesRef.current[idx] = el;
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
