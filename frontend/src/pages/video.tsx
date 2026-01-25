import React, { useCallback, useMemo, useRef, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function SrtVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<HTMLTrackElement | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [subsUrl, setSubsUrl] = useState("");
  const [offset, setOffset] = useState<number>(0);
  const [subtitlePosition, setSubtitlePosition] = useState<number>(50);

  const [status, setStatus] = useState<string>("");
  const [originalSrtText, setOriginalSrtText] = useState<string>("");

  const [showUI, setShowUI] = useState<boolean>(false);

  const setTrackFromVttText = useCallback((vttText: string) => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!video || !track) return;

    const blob = new Blob([vttText], { type: "text/vtt" });
    const blobUrl = URL.createObjectURL(blob);

    track.src = blobUrl;

    const current = video.currentTime;
    video.load();
    video.currentTime = current;
  }, []);

  const srtToVtt = useCallback((srtText: string) => {
    const normalized = srtText.replace(/\r+/g, "");
    const vttBody = normalized.replaceAll(",", ".");
    return "WEBVTT\n\n" + vttBody.trim() + "\n";
  }, []);

  const shiftVttTime = useCallback((timeStr: string, offsetSeconds: number) => {
    const parts = timeStr.split(":");
    if (parts.length !== 3) return timeStr;

    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parseFloat(parts[2]);

    let total = h * 3600 + m * 60 + s + offsetSeconds;
    if (total < 0) total = 0;

    const hh = String(Math.floor(total / 3600)).padStart(2, "0");
    const mm = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
    const ss = String((total % 60).toFixed(3)).padStart(6, "0");

    return `${hh}:${mm}:${ss}`;
  }, []);

  const applyOffsetToVtt = useCallback(
    (vttText: string, offsetSeconds: number) =>
      vttText.replace(
        /(\d{2}:\d{2}:\d{2}\.\d{3})\s-->\s(\d{2}:\d{2}:\d{2}\.\d{3})/g,
        (_, start, end) =>
          `${shiftVttTime(start, offsetSeconds)} --> ${shiftVttTime(
            end,
            offsetSeconds
          )}`
      ),
    [shiftVttTime]
  );

  const applyHorizontalPositionToVtt = useCallback(
    (vttText: string, positionPercent: number) =>
      vttText.replace(
        /(\d{2}:\d{2}:\d{2}\.\d{3})\s-->\s(\d{2}:\d{2}:\d{2}\.\d{3}).*$/gm,
        (_, start, end) =>
          `${start} --> ${end} line:90% position:${clamp(
            positionPercent,
            0,
            100
          )}% align:middle`
      ),
    []
  );

  async function loadSrtFromUrl(url: string) {
    setStatus("Descargando subtítulos…");
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo descargar el SRT");
    return await res.text();
  }

  const buildFinalVtt = useCallback(
    (srt: string, off: number, pos: number) =>
      applyHorizontalPositionToVtt(
        applyOffsetToVtt(srtToVtt(srt), off),
        pos
      ),
    [applyHorizontalPositionToVtt, applyOffsetToVtt, srtToVtt]
  );

  const handleLoad = useCallback(async () => {
    if (!videoUrl || !subsUrl) {
      setStatus("Pon el link del video y subtítulos.");
      return;
    }

    try {
      setStatus("Cargando…");
      const video = videoRef.current;
      if (video) {
        video.src = videoUrl.trim();
        video.load();
      }

      const srt = await loadSrtFromUrl(subsUrl.trim());
      setOriginalSrtText(srt);

      setTrackFromVttText(buildFinalVtt(srt, 0, subtitlePosition));
      setStatus("Listo ✨");
    } catch {
      setStatus("Error cargando subtítulos (CORS o link inválido).");
    }
  }, [videoUrl, subsUrl, subtitlePosition, buildFinalVtt, setTrackFromVttText]);

  const handleApplyOffset = useCallback(() => {
    if (!originalSrtText) return;
    setTrackFromVttText(
      buildFinalVtt(originalSrtText, offset, subtitlePosition)
    );
    setStatus(`Offset aplicado: ${offset}s`);
  }, [originalSrtText, offset, subtitlePosition, buildFinalVtt, setTrackFromVttText]);

  const move = (delta: number) => {
    if (!originalSrtText) return;
    setSubtitlePosition((p) => {
      const n = clamp(p + delta, 0, 100);
      setTrackFromVttText(buildFinalVtt(originalSrtText, offset, n));
      return n;
    });
  };

  const hint = useMemo(
    () => (
      <>
        <b>Tip iPad:</b> mueve la posición si se pegan.
        <br />
        Offset + retrasa · Offset - adelanta
      </>
    ),
    []
  );

  return (
    <div style={styles.page}>
      {/* BOTÓN SIEMPRE VISIBLE */}
      <button style={styles.toggleBtn} onClick={() => setShowUI(v => !v)}>
        {showUI ? "Ocultar configuración" : "Mostrar configuración"}
      </button>

      {showUI && (
        <div style={styles.shell}>
          <div style={styles.topbar}>
            <div>
              <div style={styles.brand}>Para ceci {"<3"}</div>
              <div style={styles.subtitle}>Siempre visible</div>
            </div>
            <div style={styles.topPill}>{subtitlePosition}%</div>
          </div>

          <div style={styles.grid}>
            <div>
              <style>{`
                video::cue {
                  background: rgba(0,0,0,0.55);
                  color: white;
                  font-size: 16px;
                  line-height: 1.2;
                }
              `}</style>

              <div style={styles.videoFrame}>
                <video ref={videoRef} controls style={styles.video}>
                  <track ref={trackRef} kind="subtitles" srcLang="es" default />
                </video>
              </div>

              <div style={styles.status}>{status}</div>
              <div style={styles.hint}>{hint}</div>
            </div>

            <div style={styles.controlsCard}>
              <input
                style={styles.input}
                placeholder="Video .mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              <input
                style={styles.input}
                placeholder="Subtítulos .srt"
                value={subsUrl}
                onChange={(e) => setSubsUrl(e.target.value)}
              />

              <button style={styles.primaryBtn} onClick={handleLoad}>
                Cargar
              </button>

              <input
                type="number"
                step="0.1"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
                style={styles.input}
              />

              <button style={styles.secondaryBtn} onClick={handleApplyOffset}>
                Aplicar offset
              </button>

              <div style={styles.row}>
                <button onClick={() => move(-5)}>⬅️</button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={subtitlePosition}
                  onChange={(e) =>
                    move(Number(e.target.value) - subtitlePosition)
                  }
                />
                <button onClick={() => move(5)}>➡️</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 👇 ESTO ES LO QUE HACE QUE SCROLLEE */}
      <div style={{ height: "150vh" }} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    width: "100%",
    padding: 18,
    color: "white",

    backgroundImage: "url('/ceci2.png')",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "top center",
    backgroundSize: "100% auto",
    backgroundAttachment: "scroll",

    fontFamily: "system-ui",
  },

  toggleBtn: {
    position: "fixed",
    top: 18,
    right: 18,
    zIndex: 10,
    padding: "10px 14px",
    borderRadius: 14,
    background: "rgba(0,0,0,0.45)",
    color: "white",
    border: "1px solid rgba(255,255,255,0.3)",
    cursor: "pointer",
    backdropFilter: "blur(6px)",
  },

  shell: {
    maxWidth: 1100,
    margin: "80px auto 0",
  },

  topbar: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  brand: { fontWeight: 800 },
  subtitle: { opacity: 0.7 },
  topPill: { opacity: 0.9 },

  grid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: 14,
  },

  videoFrame: {
    borderRadius: 16,
    overflow: "hidden",
  },

  video: {
    width: "100%",
    aspectRatio: "16 / 9",
    background: "black",
  },

  status: { marginTop: 8, opacity: 0.9 },
  hint: { fontSize: 12, opacity: 0.8 },

  controlsCard: {
    display: "grid",
    gap: 10,
  },

  input: {
    padding: 10,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.4)",
    background: "rgba(0,0,0,0.15)",
    color: "white",
  },

  primaryBtn: {
    padding: 10,
    borderRadius: 14,
    background: "rgba(79,70,229,0.9)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },

  secondaryBtn: {
    padding: 10,
    borderRadius: 14,
    background: "rgba(255,255,255,0.2)",
    color: "white",
    cursor: "pointer",
  },

  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
};