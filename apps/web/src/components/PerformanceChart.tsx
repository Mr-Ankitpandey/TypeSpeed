export type Sample = {
  seconds: number;
  wpm: number;
  accuracy: number;
  characters: number;
};
export function PerformanceChart({ samples }: { samples: Sample[] }) {
  if (!samples.length) return null;
  const max = Math.max(10, ...samples.map((s) => s.wpm));
  const duration = Math.max(1, samples.at(-1)!.seconds);
  const points = samples
    .map(
      (s) =>
        `${10 + (s.seconds / duration) * 580},${140 - (s.wpm / max) * 120}`,
    )
    .join(' ');
  return (
    <figure className="performance-chart">
      <figcaption>Speed over time · peak {max.toFixed(1)} WPM</figcaption>
      <svg
        viewBox="0 0 600 165"
        role="img"
        aria-label={`WPM over ${duration.toFixed(0)} seconds`}
      >
        <path
          d="M10 20 V140 H590"
          fill="none"
          stroke="currentColor"
          opacity=".3"
        />
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
        />
        <text x="10" y="160" fill="currentColor" fontSize="11">
          0s
        </text>
        <text x="555" y="160" fill="currentColor" fontSize="11">
          {duration.toFixed(0)}s
        </text>
      </svg>
      <details>
        <summary>View performance data</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Seconds</th>
                <th>WPM</th>
                <th>Accuracy</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((s, i) => (
                <tr key={i}>
                  <td>{s.seconds.toFixed(1)}</td>
                  <td>{s.wpm.toFixed(1)}</td>
                  <td>{s.accuracy.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
