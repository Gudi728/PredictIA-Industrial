const WIDTH = 620;
const HEIGHT = 230;
const PAD = { left: 46, right: 14, top: 16, bottom: 36 };

const round2 = (value) => Math.round(value * 100) / 100;

const formatAxisTime = (value) =>
  new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatTooltip = (value) => new Date(value).toLocaleString();

const MeasurementChart = ({ title, unit, limit, points }) => {
  const lastPoint = points.length > 0 ? points[points.length - 1] : null;

  let plot = null;

  if (points.length > 0) {
    const values = points.map((point) => point.valor);
    let min = Math.min(...values);
    let max = Math.max(...values);

    if (typeof limit === "number") {
      min = Math.min(min, limit);
      max = Math.max(max, limit);
    }

    if (min === max) {
      min -= 1;
      max += 1;
    }

    const padding = (max - min) * 0.12;
    min -= padding;
    max += padding;

    const innerWidth = WIDTH - PAD.left - PAD.right;
    const innerHeight = HEIGHT - PAD.top - PAD.bottom;

    const x = (index) =>
      points.length === 1
        ? PAD.left + innerWidth / 2
        : PAD.left + (index * innerWidth) / (points.length - 1);
    const y = (value) => PAD.top + ((max - value) * innerHeight) / (max - min);

    const polyline = points.map((point, index) => `${x(index)},${y(point.valor)}`).join(" ");
    const limitY = typeof limit === "number" ? y(limit) : null;
    const first = points[0];

    plot = (
      <svg
        className="chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Historial de ${title}`}
      >
        <line className="chart-axis" x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={HEIGHT - PAD.bottom} />
        <line className="chart-axis" x1={PAD.left} y1={HEIGHT - PAD.bottom} x2={WIDTH - PAD.right} y2={HEIGHT - PAD.bottom} />

        <text className="chart-tick" x={PAD.left - 6} y={y(max) + 3} textAnchor="end">{round2(max)}</text>
        <text className="chart-tick" x={PAD.left - 6} y={y(min) + 3} textAnchor="end">{round2(min)}</text>

        <text className="chart-tick" x={PAD.left} y={HEIGHT - 12} textAnchor="start">{formatAxisTime(first.fecha_hora)}</text>
        <text className="chart-tick" x={WIDTH - PAD.right} y={HEIGHT - 12} textAnchor="end">{formatAxisTime(lastPoint.fecha_hora)}</text>

        {limitY !== null && (
          <>
            <line
              className="chart-limit"
              x1={PAD.left}
              y1={limitY}
              x2={WIDTH - PAD.right}
              y2={limitY}
            />
            <text className="chart-limit-label" x={WIDTH - PAD.right} y={limitY - 5} textAnchor="end">
              Límite {limit} {unit}
            </text>
          </>
        )}

        {points.length > 1 && <polyline className="chart-line" points={polyline} />}
        {points.map((point, index) => (
          <circle key={point.id} className="chart-point" cx={x(index)} cy={y(point.valor)} r="3.4">
            <title>{`${round2(point.valor)} ${unit} · ${formatTooltip(point.fecha_hora)}`}</title>
          </circle>
        ))}
      </svg>
    );
  }

  return (
    <section className="chart-card" aria-label={title}>
      <header className="chart-card-heading">
        <h3>{title}</h3>
        <span className="chart-last-value">
          {lastPoint ? `${round2(lastPoint.valor)} ${unit}` : "Sin datos"}
        </span>
      </header>
      {plot ?? <div className="chart-empty">Sin mediciones registradas para esta variable.</div>}
    </section>
  );
};

export default MeasurementChart;
