"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "@/lib/router";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { LiquidButton } from "../components/ui/LiquidGlassButton";
import jsQR from "jsqr";

const extractQrHash = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const fromPath = (pathLike = "") => {
    const normalized = decodeURIComponent(
      String(pathLike || "").trim(),
    ).replace(/\/+$/, "");
    if (!normalized) return null;

    // Supports both /scan/:hash and /redeem/:hash URLs
    const match = normalized.match(/\/(?:scan|redeem)\/([^/?#]+)/i);
    if (match?.[1]) return match[1].trim();
    return null;
  };

  try {
    const url = new URL(raw);
    const pathHash = fromPath(url.pathname);
    if (pathHash) return pathHash;

    const queryHash =
      url.searchParams.get("hash") ||
      url.searchParams.get("qr") ||
      url.searchParams.get("code");
    if (queryHash) return String(queryHash).trim();
  } catch (_) {
    // Not a URL, try path-like or raw hash forms below.
  }

  const pathLikeHash = fromPath(raw);
  if (pathLikeHash) return pathLikeHash;

  // Raw hash directly inside the QR
  return raw.replace(/^#/, "").trim() || null;
};

const CameraScan = () => {
  const navigate = useNavigate();
  const [scanError, setScanError] = useState(null);
  const [isScanning, setIsScanning] = useState(true);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(null);

  const handleScan = useCallback(
    (hash) => {
      setIsScanning(false);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      navigate(`/scan/${encodeURIComponent(hash)}`);
    },
    [navigate],
  );

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", true);
          videoRef.current.play().catch((e) => {
            if (mounted) console.warn("Video play interrupted", e);
          });
          requestAnimationFrame(tick);
        }
      } catch (err) {
        if (!mounted) return;
        console.error("Camera error:", err);
        setScanError(
          "Could not access camera. Please ensure you have granted camera permissions.",
        );
        setIsScanning(false);
      }
    };

    const tick = () => {
      if (!mounted || !isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        if (canvas) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
              const imageData = ctx.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const code = jsQR(
                imageData.data,
                imageData.width,
                imageData.height,
                { inversionAttempts: "dontInvert" },
              );

              if (code && code.data) {
                const hash = extractQrHash(code.data);
                if (hash) {
                  handleScan(hash);
                  return; // Stop ticking
                }
              }
            } catch (e) {
              // Ignore canvas read errors if tab is backgrounded
            }
          }
        }
      }

      requestRef.current = requestAnimationFrame(tick);
    };

    if (isScanning) {
      startCamera();
    }

    return () => {
      mounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isScanning, handleScan]);

  const handleClose = () => {
    setIsScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    navigate("/");
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header / Controls */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-linear-to-b from-black/70 to-transparent">
        <button
          onClick={handleClose}
          className="p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="text-white font-medium text-lg">Scan QR Code</div>
        <div className="w-10"></div> {/* Spacer for center alignment */}
      </div>

      {/* Scanner Container */}
      <div className="flex-1 flex flex-col justify-center items-center relative overflow-hidden bg-black">
        {scanError ? (
          <div className="p-6 text-center max-w-xs mx-auto">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-white text-lg font-bold mb-2">Camera Error</h3>
            <p className="text-gray-400 text-sm mb-6">{scanError}</p>
            <LiquidButton
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Retry Camera
            </LiquidButton>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              muted
              playsInline
            />
            {/* Hidden canvas used mapping video data to jsQR */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Overlay guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[250px] h-[250px] border-2 border-white/50 rounded-lg relative overflow-hidden">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary -mt-1 -ml-1 rounded-tl-lg"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary -mt-1 -mr-1 rounded-tr-lg"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary -mb-1 -ml-1 rounded-bl-lg"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary -mb-1 -mr-1 rounded-br-lg"></div>

                {/* Scanning bar animation */}
                <div className="absolute bg-primary/50 h-0.5 w-full top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
            </div>

            <div className="absolute bottom-20 text-white/80 text-sm font-medium bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
              Align QR code within the frame
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default CameraScan;
