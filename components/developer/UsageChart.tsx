'use client';

/**
 * The usage chart: requests a day, with refused requests stacked on top.
 *
 * Hand-rolled SVG rather than a charting library. The site already ships
 * hand-rolled charts in the admin console, the shape here is one series of
 * bars, and a library would be the largest dependency on a page that otherwise
 * loads nothing.
 *
 * Two decisions worth keeping:
 *
 * Refused requests are stacked on the same bar rather than drawn as a second
 * series beside it. The question a developer has is "how much of my traffic is
 * failing", which is a proportion of one bar, not two bars to compare.
 *
 * The daily limit is drawn as a line across the plot when it is within reach of
 * the data. Drawing it always would flatten every real bar to nothing on a Free
 * account that made forty requests against a cap of ten thousand.
 */

import { useId, useMemo, useState } from 'react';
import { num } from './primitives';

/**
 * Only the three fields the chart draws, so both usage shapes fit: the
 * account's series carries a per-status breakdown this chart does not use, and
 * one key's series does not have it at all.
 */
export type ChartPoint = { day: string; requests: number; rejected: number };

type Point = ChartPoint;

export default function UsageChart({
  series,
  dailyLimit,
  height = 180,
}: {
  series: Point[];
  dailyLimit?: number;
  height?: number;
}) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const geometry = useMemo(() => {
    // The bar's full height, for scaling, and the requests-only peak, for the
    // readout. They have to be separate: the readout says "busiest day", which
    // is the same label the stat tiles use for the API's own peak, and two
    // numbers under one label is worse than no number.
    const stacked = series.reduce((max, day) => Math.max(max, day.requests + day.rejected), 0);
    const peak = series.reduce((max, day) => Math.max(max, day.requests), 0);
    // An empty range still draws an axis and a baseline rather than collapsing
    // to a blank box, so "no traffic yet" looks like a chart with no bars.
    const limitInRange = !!dailyLimit && dailyLimit > 0 && dailyLimit <= stacked * 1.6 && stacked > 0;
    const ceiling = Math.max(1, limitInRange ? Math.max(stacked, dailyLimit!) : stacked);
    return { peak, ceiling, limitInRange };
  }, [series, dailyLimit]);

  const width = 720;
  const padLeft = 4;
  const padBottom = 18;
  const plot = height - padBottom;
  const count = Math.max(1, series.length);
  const slot = (width - padLeft * 2) / count;
  const barWidth = Math.max(2, Math.min(18, slot * 0.62));

  function y(value: number): number {
    return plot - (value / geometry.ceiling) * plot;
  }

  const limitY = geometry.limitInRange ? y(dailyLimit!) : null;
  const active = hover === null ? null : series[hover];

  return (
    <div className="dc-chart">
      <style jsx>{`
        .dc-chart {
          position: relative;
        }
        svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
        .bar-ok {
          fill: #38bdf8;
        }
        .bar-bad {
          fill: #f87171;
        }
        .bar-slot {
          fill: transparent;
          cursor: default;
        }
        .bar-slot:hover + g .bar-ok,
        .bar-slot:focus + g .bar-ok {
          fill: #7dd3fc;
        }
        .baseline,
        .gridline {
          stroke: rgba(255, 255, 255, 0.08);
          stroke-width: 1;
        }
        .limitline {
          stroke: #fbbf24;
          stroke-width: 1;
          stroke-dasharray: 3 3;
          opacity: 0.75;
        }
        .limitlabel {
          fill: #fbbf24;
          font-size: 9px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .tick {
          fill: #64748b;
          font-size: 9px;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .readout {
          display: flex;
          flex-wrap: wrap;
          gap: 0.35rem 1rem;
          margin-top: 0.6rem;
          font-size: 0.82rem;
          color: #94a3b8;
          min-height: 1.3em;
        }
        .readout strong {
          color: #e2e8f0;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 600;
        }
        .swatch {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 2px;
          margin-right: 0.35rem;
        }
      `}</style>

      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId}>
        <title id={titleId}>
          {`Requests a day over the last ${series.length} days. Busiest day: ${num(geometry.peak)}.`}
        </title>

        {limitY !== null ? (
          <>
            <line className="limitline" x1={padLeft} y1={limitY} x2={width - padLeft} y2={limitY} />
            <text className="limitlabel" x={padLeft} y={limitY - 4}>
              daily limit {num(dailyLimit!)}
            </text>
          </>
        ) : null}

        <line className="baseline" x1={padLeft} y1={plot} x2={width - padLeft} y2={plot} />

        {series.map((day, index) => {
          const x = padLeft + index * slot + (slot - barWidth) / 2;
          const okHeight = Math.max(0, plot - y(day.requests));
          const badHeight = day.rejected > 0 ? Math.max(1.5, (day.rejected / geometry.ceiling) * plot) : 0;
          return (
            <g key={day.day}>
              {/* The whole column is the hit area, not the bar: a one-pixel
                  bar on a quiet day is not something anyone can point at. */}
              <rect
                className="bar-slot"
                x={padLeft + index * slot}
                y={0}
                width={slot}
                height={plot}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                role="button"
                aria-label={`${day.day}: ${num(day.requests)} requests, ${num(day.rejected)} refused`}
              />
              <g>
                {badHeight > 0 ? (
                  <rect
                    className="bar-bad"
                    x={x}
                    y={y(day.requests) - badHeight}
                    width={barWidth}
                    height={badHeight}
                    rx={1}
                  />
                ) : null}
                <rect
                  className="bar-ok"
                  x={x}
                  y={y(day.requests)}
                  width={barWidth}
                  height={okHeight}
                  rx={1}
                  opacity={hover === null || hover === index ? 1 : 0.45}
                />
              </g>
            </g>
          );
        })}

        {/* Only the ends are labelled. A tick under every bar at phone width is
            an unreadable smear; the hover readout names the exact day. */}
        {series.length > 0 ? (
          <>
            <text className="tick" x={padLeft} y={height - 4}>
              {shortDay(series[0].day)}
            </text>
            <text className="tick" x={width - padLeft} y={height - 4} textAnchor="end">
              {shortDay(series[series.length - 1].day)}
            </text>
          </>
        ) : null}
      </svg>

      <div className="readout" aria-live="polite">
        {active ? (
          <>
            <span>
              <strong>{shortDay(active.day)}</strong>
            </span>
            <span>
              <span className="swatch" style={{ background: '#38bdf8' }} />
              <strong>{num(active.requests)}</strong> requests
            </span>
            <span>
              <span className="swatch" style={{ background: '#f87171' }} />
              <strong>{num(active.rejected)}</strong> refused
            </span>
          </>
        ) : (
          <>
            <span>
              <span className="swatch" style={{ background: '#38bdf8' }} />
              Requests
            </span>
            <span>
              <span className="swatch" style={{ background: '#f87171' }} />
              Refused
            </span>
            <span>
              Busiest day <strong>{num(geometry.peak)}</strong>
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** "2026-11-01" as the reader's own short date. */
function shortDay(day: string): string {
  const when = new Date(`${day}T00:00:00`);
  if (Number.isNaN(when.getTime())) return day;
  return when.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}
