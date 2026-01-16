import React, { useCallback, useMemo, useRef, useState } from "react";

const BG_IMAGES = [
  "https://plus.unsplash.com/premium_photo-1696945512425-9370bbf157cf?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1666533424151-aae0a59469d1?q=80&w=1035&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1562095693-c517d3352e97?q=80&w=1481&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "https://images.unsplash.com/photo-1654715571646-f33deae8319a?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickBgImage() {
  return BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)];
}

export default function SrtVideoPlayer() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<HTMLTrackElement | null>(null);

  const [bgImage] = useState(() => pickBgImage());

  const [videoUrl, setVideoUrl] = useState("");
  const [subsUrl, setSubsUrl] = useState("");
  const [offset, setOffset] = useState<number>(0);

  const [subtitlePosition, setSubtitlePosition] = useState<number>(50);

  const [status, setStatus] = useState<string>("");
  const [originalSrtText, setOriginalSrtText] = useState<string>("");

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

  const applyHorizontalPositionToVtt = useCallback(
    (vttText: string, positionPercent: number) => {
      const pos = clamp(positionPercent, 0, 100);

      return vttText.replace(
        /(\d{2}:\d{2}:\d{2}\.\d{3})\s-->\s(\d{2}:\d{2}:\d{2}\.\d{3})(.*)$/gm,
        (_match, start, end) => {
          return `${start} --> ${end} line:90% position:${pos}% align:middle`;
        }
      );
    },
    []
  );

  async function loadSrtFromUrl(url: string) {
    setStatus("Descargando subtítulos…");
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo descargar el SRT");
    return await res.text();
  }

  const buildFinalVtt = useCallback(
    (srtText: string, offsetSeconds: number, posPercent: number) => {
      const baseVtt = srtToVtt(srtText);
      const shifted = applyOffsetToVtt(baseVtt, offsetSeconds);
      const positioned = applyHorizontalPositionToVtt(shifted, posPercent);
      return positioned;
    },
    [applyHorizontalPositionToVtt, applyOffsetToVtt, srtToVtt]
  );

  const handleLoad = useCallback(async () => {
    if (!videoUrl.trim()) {
      setStatus("Pon el link del video.");
      return;
    }
    if (!subsUrl.trim()) {
      setStatus("Pon el link del subtítulo (.srt).");
      return;
    }

    try {
      setStatus("Cargando video…");
      setOriginalSrtText("");

      const video = videoRef.current;
      if (video) {
        video.src = videoUrl.trim();
        video.load();
      }

      const srt = await loadSrtFromUrl(subsUrl.trim());
      setOriginalSrtText(srt);

      const finalVtt = buildFinalVtt(srt, 0, subtitlePosition);
      setTrackFromVttText(finalVtt);

      setStatus("Listo ✨ Subtítulos cargados.");
    } catch (err) {
      console.error(err);
      setStatus("Error cargando SRT (probable CORS o link inválido).");
    }
  }, [buildFinalVtt, subsUrl, subtitlePosition, videoUrl, setTrackFromVttText]);

  const handleApplyOffset = useCallback(() => {
    if (!originalSrtText) {
      setStatus("Primero carga los subtítulos.");
      return;
    }

    const finalVtt = buildFinalVtt(
      originalSrtText,
      Number(offset || 0),
      subtitlePosition
    );
    setTrackFromVttText(finalVtt);
    setStatus(`Offset aplicado: ${Number(offset || 0)}s`);
  }, [
    buildFinalVtt,
    offset,
    originalSrtText,
    setTrackFromVttText,
    subtitlePosition,
  ]);

  const handleReset = useCallback(() => {
    setOffset(0);
    setSubtitlePosition(50);

    if (!originalSrtText) {
      setStatus("Reset listo.");
      return;
    }

    const finalVtt = buildFinalVtt(originalSrtText, 0, 50);
    setTrackFromVttText(finalVtt);
    setStatus("Reset listo.");
  }, [buildFinalVtt, originalSrtText, setTrackFromVttText]);

  const moveLeft = useCallback(() => {
    if (!originalSrtText) {
      setStatus("Primero carga los subtítulos.");
      return;
    }

    setSubtitlePosition((prev) => {
      const next = clamp(prev - 5, 0, 100);
      const finalVtt = buildFinalVtt(originalSrtText, Number(offset || 0), next);
      setTrackFromVttText(finalVtt);
      setStatus(`Subtítulos: ${next}%`);
      return next;
    });
  }, [buildFinalVtt, offset, originalSrtText, setTrackFromVttText]);

  const moveRight = useCallback(() => {
    if (!originalSrtText) {
      setStatus("Primero carga los subtítulos.");
      return;
    }

    setSubtitlePosition((prev) => {
      const next = clamp(prev + 5, 0, 100);
      const finalVtt = buildFinalVtt(originalSrtText, Number(offset || 0), next);
      setTrackFromVttText(finalVtt);
      setStatus(`Subtítulos: ${next}%`);
      return next;
    });
  }, [buildFinalVtt, offset, originalSrtText, setTrackFromVttText]);

  const handlePositionSlider = useCallback(
    (value: number) => {
      const next = clamp(value, 0, 100);
      setSubtitlePosition(next);

      if (!originalSrtText) return;

      const finalVtt = buildFinalVtt(originalSrtText, Number(offset || 0), next);
      setTrackFromVttText(finalVtt);
      setStatus(`Subtítulos: ${next}%`);
    },
    [buildFinalVtt, offset, originalSrtText, setTrackFromVttText]
  );

  const hint = useMemo(() => {
    return (
      <>
        <span style={{ opacity: 0.95 }}>
          Si en iPad salen pegados, ajusta <b>posición</b>.
        </span>
        <div style={{ height: 6 }} />
        <span style={{ opacity: 0.8 }}>
          Offset + atrasado (<code style={styles.code}>+1.5</code>) · Offset -
          adelantado (<code style={styles.code}>-2</code>)
        </span>
      </>
    );
  }, []);

  return (
    <div style={styles.page}>
      {/* Background (más visible, casi sin blur) */}
      <div
        style={{
          ...styles.bg,
          backgroundImage: `url(${bgImage})`,
        }}
      />

      {/* Overlay MUY ligero (no tapa la foto) */}
      <div style={styles.bgOverlay} />

      {/* Grain sutil (cinematic) */}
      <div style={styles.grain} />

      <div style={styles.shell}>
        {/* Topbar */}
        <div style={styles.topbar}>
          <div>
            <div style={styles.brand}>Para ceci {'<3'}</div>
            <div style={styles.subtitle}>Minimal · Cinematic · iPad-friendly</div>
          </div>

          <div style={styles.topPill}>
            <span style={{ opacity: 0.85 }}>Posición</span>
            <b style={{ marginLeft: 8 }}>{subtitlePosition}%</b>
          </div>
        </div>

        <div style={styles.grid}>
          {/* Player */}
          <div style={styles.playerCard}>
            <style>{`
              video::cue {
                text-align: center !important;
                line-height: 1.2 !important;
                background: rgba(0, 0, 0, 0.50) !important;
                color: #fff !important;
                font-size: 16px !important;
              }
              video::-webkit-media-text-track-display {
                text-align: center !important;
              }
            `}</style>

            <div style={styles.videoFrame}>
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
            </div>

            <div style={styles.statusRow}>
              <div style={styles.statusDot} />
              <div style={styles.statusText}>{status || "Listo para cargar."}</div>
            </div>

            <div style={styles.hint}>{hint}</div>
          </div>

          {/* Controls */}
          <div style={styles.controlsCard}>
            <div style={styles.sectionTitle}>Cargar</div>

            <div style={styles.field}>
              <label style={styles.label}>Video (.mp4)</label>
              <input
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://..."
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Subtítulos (.srt)</label>
              <input
                value={subsUrl}
                onChange={(e) => setSubsUrl(e.target.value)}
                placeholder="https://...subtitles.srt"
                style={styles.input}
              />
            </div>

            <div style={styles.actionsRow}>
              <button type="button" onClick={handleLoad} style={styles.primaryBtn}>
                Cargar
              </button>
              <button type="button" onClick={handleReset} style={styles.ghostBtn}>
                Reset
              </button>
            </div>

            <div style={styles.divider} />

            <div style={styles.sectionTitle}>Sincronización</div>

            <div style={styles.field}>
              <label style={styles.label}>Offset (segundos)</label>
              <div style={styles.inline}>
                <input
                  type="number"
                  step="0.1"
                  value={offset}
                  onChange={(e) => setOffset(Number(e.target.value))}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={handleApplyOffset}
                  style={styles.secondaryBtn}
                >
                  Aplicar
                </button>
              </div>
            </div>

            <div style={styles.divider} />

            <div style={styles.sectionTitle}>Posición (iPad fix)</div>

            <div style={styles.subtitleAdjustRow}>
              <button type="button" onClick={moveLeft} style={styles.iconBtn}>
                ⬅️
              </button>

              <input
                type="range"
                min={0}
                max={100}
                value={subtitlePosition}
                onChange={(e) => handlePositionSlider(Number(e.target.value))}
                style={styles.slider}
              />

              <button type="button" onClick={moveRight} style={styles.iconBtn}>
                ➡️
              </button>
            </div>

            <div style={styles.smallNote}>
              Centro ideal: <b>50%</b>. Si Safari se “atora”, muévelo poquito y
              regresa.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    position: "relative",
    minHeight: "100vh",
    overflow: "hidden",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
    color: "rgba(255,255,255,0.94)",
    padding: 18,
  },

  // 🔥 Fondo más visible (sin blur agresivo)
  bg: {
    position: "absolute",
    inset: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    transform: "scale(1.02)",
    filter: "blur(4px) saturate(1.35) contrast(1.1)",
    opacity: 1,
  },

  // 🔥 Overlay MUY ligero
  bgOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(1000px 520px at 18% 10%, rgba(79,70,229,0.18), transparent 62%), radial-gradient(900px 520px at 82% 18%, rgba(255,255,255,0.16), transparent 55%), linear-gradient(to bottom, rgba(0,0,0,0.18), rgba(0,0,0,0.38))",
  },

  // Grain para look cinematográfico
  grain: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.8%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22200%22 height=%22200%22 filter=%22url(%23n)%22 opacity=%220.18%22/%3E%3C/svg%3E')",
    opacity: 0.12,
    mixBlendMode: "overlay",
  },

  shell: {
    position: "relative",
    maxWidth: 1120,
    margin: "0 auto",
  },

  topbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 14px",
    borderRadius: 20,
    background: "rgba(0,0,0,0.22)",
    border: "1px solid rgba(255,255,255,0.14)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    marginBottom: 14,
  },

  brand: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: -0.2,
  },

  subtitle: {
    fontSize: 12,
    opacity: 0.75,
    marginTop: 2,
  },

  topPill: {
    display: "flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "8px 12px",
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    fontSize: 13,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "1.55fr 1fr",
    gap: 14,
  },

  // 🔥 Cards ultra transparentes para que se vea el fondo
  playerCard: {
    borderRadius: 22,
    padding: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },

  controlsCard: {
    borderRadius: 22,
    padding: 14,
    background: "rgba(0,0,0,0.18)",
    border: "1px solid rgba(255,255,255,0.16)",
    boxShadow: "0 20px 70px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
  },

  videoFrame: {
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
  },

  video: {
    width: "100%",
    display: "block",
    background: "black",
    aspectRatio: "16 / 9",
  },

  statusRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 16,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(255,255,255,0.14)",
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    background: "rgba(79,70,229,0.95)",
    boxShadow: "0 0 0 6px rgba(79,70,229,0.16)",
  },

  statusText: {
    fontSize: 13,
    opacity: 0.92,
  },

  hint: {
    marginTop: 10,
    fontSize: 13,
    opacity: 0.9,
    lineHeight: 1.35,
    padding: "0 4px",
  },

  sectionTitle: {
    fontSize: 13,
    opacity: 0.85,
    fontWeight: 800,
    letterSpacing: 0.2,
    marginBottom: 10,
  },

  field: {
    marginBottom: 12,
  },

  label: {
    display: "block",
    fontSize: 12,
    opacity: 0.75,
    marginBottom: 6,
  },

  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.25)",
    color: "rgba(255,255,255,0.95)",
    outline: "none",
  },

  actionsRow: {
    display: "flex",
    gap: 10,
  },

  inline: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  primaryBtn: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.16)",
    background:
      "linear-gradient(135deg, rgba(79,70,229,0.95), rgba(124,58,237,0.85))",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },

  secondaryBtn: {
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.95)",
    fontWeight: 750,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.95)",
    fontWeight: 750,
    cursor: "pointer",
  },

  divider: {
    height: 1,
    background: "rgba(255,255,255,0.14)",
    margin: "14px 0",
  },

  subtitleAdjustRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  iconBtn: {
    width: 46,
    height: 44,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
    color: "rgba(255,255,255,0.95)",
    fontWeight: 900,
    cursor: "pointer",
  },

  slider: {
    width: "100%",
    accentColor: "rgba(79,70,229,0.95)" as any,
  },

  smallNote: {
    marginTop: 10,
    fontSize: 12,
    opacity: 0.78,
    lineHeight: 1.35,
  },

  code: {
    background: "rgba(255,255,255,0.14)",
    padding: "2px 6px",
    borderRadius: 10,
  },
};