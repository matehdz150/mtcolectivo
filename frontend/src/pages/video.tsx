import React, { useCallback, useMemo, useRef, useState } from "react";

export default function SrtVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<HTMLTrackElement | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [subsUrl, setSubsUrl] = useState("");
  const [offset, setOffset] = useState<number>(0);

  const [status, setStatus] = useState<string>("");
  const [originalSrtText, setOriginalSrtText] = useState<string>("");

  const setTrackFromVttText = useCallback((vttText: string) => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!video || !track) return;

    const blob = new Blob([vttText], { type: "text/vtt" });
    const blobUrl = URL.createObjectURL(blob);

    track.src = blobUrl;

    // Recargar track sin reiniciar el tiempo
    const current = video.currentTime;
    video.load();
    video.currentTime = current;
  }, []);

  // ---- SRT -> VTT ----
  const srtToVtt = useCallback((srtText: string) => {
    const normalized = srtText.replace(/\r+/g, "");
    const vttBody = normalized.replaceAll(",", ".");
    return "WEBVTT\n\n" + vttBody.trim() + "\n";
  }, []);

  // ---- Offset en VTT ----
  const shiftVttTime = useCallback((timeStr: string, offsetSeconds: number) => {
    const parts = timeStr.split(":");
    if (parts.length !== 3) return timeStr;

    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseFloat(parts[2]);

    let total = h * 3600 + m * 60 + s;
    total += offsetSeconds;
    if (total < 0) total = 0;

    const newH = Math.floor(total / 3600);
    const newM = Math.floor((total % 3600) / 60);
    const newS = (total % 60).toFixed(3);

    const hh = String(newH).padStart(2, "0");
    const mm = String(newM).padStart(2, "0");
    const ss = String(newS).padStart(6, "0");

    return `${hh}:${mm}:${ss}`;
  }, []);

  const applyOffsetToVtt = useCallback(
    (vttText: string, offsetSeconds: number) => {
      return vttText.replace(
        /(\d{2}:\d{2}:\d{2}\.\d{3})\s-->\s(\d{2}:\d{2}:\d{2}\.\d{3})/g,
        (_match, start, end) => {
          const ns = shiftVttTime(start, offsetSeconds);
          const ne = shiftVttTime(end, offsetSeconds);
          return `${ns} --> ${ne}`;
        }
      );
    },
    [shiftVttTime]
  );

  async function loadSrtFromUrl(url: string) {
    setStatus("⏳ Descargando SRT...");
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo descargar el SRT");
    return await res.text();
  }

  const handleLoad = useCallback(async () => {
    if (!videoUrl.trim()) {
      setStatus("❌ Pon el link del video.");
      return;
    }
    if (!subsUrl.trim()) {
      setStatus("❌ Pon el link del SRT.");
      return;
    }

    try {
      setStatus("⏳ Cargando video...");
      setOriginalSrtText("");

      const video = videoRef.current;
      if (video) {
        video.src = videoUrl.trim();
        video.load();
      }

      const srt = await loadSrtFromUrl(subsUrl.trim());
      setOriginalSrtText(srt);

      const vtt = srtToVtt(srt);
      setTrackFromVttText(vtt);

      setStatus("✅ Video y subtítulos cargados (SRT convertido a VTT).");
    } catch (err) {
      console.error(err);
      setStatus("❌ Error cargando SRT (casi seguro CORS o link inválido).");
    }
  }, [setTrackFromVttText, srtToVtt, subsUrl, videoUrl]);

  const handleApplyOffset = useCallback(() => {
    if (!originalSrtText) {
      setStatus("❌ Primero carga los subtítulos.");
      return;
    }

    const vtt = srtToVtt(originalSrtText);
    const shifted = applyOffsetToVtt(vtt, Number(offset || 0));

    setTrackFromVttText(shifted);
    setStatus(`✅ Offset aplicado: ${Number(offset || 0)}s`);
  }, [
    applyOffsetToVtt,
    offset,
    originalSrtText,
    setTrackFromVttText,
    srtToVtt,
  ]);

  const handleReset = useCallback(() => {
    setOffset(0);

    if (!originalSrtText) {
      setStatus("🔄 Offset reseteado a 0.");
      return;
    }

    const vtt = srtToVtt(originalSrtText);
    setTrackFromVttText(vtt);
    setStatus("🔄 Offset reseteado a 0.");
  }, [originalSrtText, setTrackFromVttText, srtToVtt]);

  const hint = useMemo(() => {
    return (
      <>
        ✅ Offset positivo si los subtítulos van <b>atrasados</b> (ej:{" "}
        <code style={styles.code}>+1.5</code>)
        <br />
        ✅ Offset negativo si van <b>adelantados</b> (ej:{" "}
        <code style={styles.code}>-2</code>)
        <br />
        ⚠️ Si falla, casi siempre es por <b>CORS</b> (el servidor bloquea la
        descarga del SRT).
      </>
    );
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={{ margin: "0 0 10px 0" }}>🎬 Player con SRT + Sync</h2>

        {/* ✅ FIX iPad/Safari: Centrar subtítulos */}
        <style>{`
          video::cue {
            text-align: center !important;
            line-height: 1.2 !important;
            background: rgba(0, 0, 0, 0.55) !important;
            color: #fff !important;
            font-size: 16px !important;
          }

          video::-webkit-media-text-track-display {
            text-align: center !important;
          }
        `}</style>

        <video
          ref={videoRef}
          controls
          crossOrigin="anonymous"
          style={styles.video}
        >
          <track
            ref={trackRef}
            label="Subtítulos"
            kind="subtitles"
            srcLang="es"
            src=""
            default
          />
          Tu navegador no soporta video HTML5.
        </video>

        <div style={styles.controls}>
          <div style={styles.box}>
            <label style={styles.label}>Link del video (.mp4)</label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://..."
              style={styles.input}
            />
          </div>

          <div style={styles.box}>
            <label style={styles.label}>Link de subtítulos (.srt)</label>
            <input
              value={subsUrl}
              onChange={(e) => setSubsUrl(e.target.value)}
              placeholder="https://...subtitles.srt"
              style={styles.input}
            />
          </div>

          <div style={styles.box}>
            <label style={styles.label}>Offset de subtítulos (segundos)</label>
            <input
              type="number"
              step="0.1"
              value={offset}
              onChange={(e) => setOffset(Number(e.target.value))}
              style={styles.input}
            />
            <button
              type="button"
              onClick={handleApplyOffset}
              style={styles.button}
            >
              Aplicar offset
            </button>
          </div>

          <div style={styles.box}>
            <label style={styles.label}>Acciones</label>
            <button type="button" onClick={handleLoad} style={styles.button}>
              Cargar video + subs
            </button>
            <button type="button" onClick={handleReset} style={styles.button}>
              Reset offset
            </button>
          </div>
        </div>

        <div style={styles.hint}>{hint}</div>
        <div style={styles.status}>{status}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 20,
    background: "#0b0b0f",
    minHeight: "100vh",
    color: "white",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  card: {
    maxWidth: 900,
    margin: "0 auto",
    background: "#141420",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    padding: 16,
  },
  video: {
    width: "100%",
    borderRadius: 12,
    background: "black",
  },
  controls: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 14,
  },
  box: {
    background: "rgba(255,255,255,0.06)",
    padding: 12,
    borderRadius: 12,
  },
  label: {
    display: "block",
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.4)",
    color: "white",
    outline: "none",
  },
  button: {
    marginTop: 10,
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "#4f46e5",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  },
  hint: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.8,
    lineHeight: 1.4,
  },
  status: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.9,
  },
  code: {
    background: "rgba(255,255,255,0.08)",
    padding: "2px 6px",
    borderRadius: 6,
  },
};