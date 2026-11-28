import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { THEMES_COLORS } from '@verichron/ui-theming';

interface PieChartProps {
  data: Array<{ id: string | number; value: number; [key: string]: any; }>;
  height?: number;
  width?: number; // Added width prop for explicit control
  colors?: string[]; // Optional custom color scale
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  padAngle?: number;
  cornerRadius?: number;
  className?: string;
  onSliceClick?: (data: { id: string | number; value: number; [key: string]: any; }, event: React.MouseEvent) => void;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  height = 300,
  width = 300, // Default width
  colors,
  innerRadius = 0.5,
  outerRadius = 0.8,
  padAngle = 0.01,
  cornerRadius = 3,
  className,
  onSliceClick,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const effectiveWidth = width;
  const effectiveHeight = height;
  const radius = Math.min(effectiveWidth, effectiveHeight) / 2;

  const pie = d3.pie<{ id: string | number; value: number; [key: string]: any }>()
    .padAngle(padAngle)
    .value((d) => d.value);

  const arc = d3.arc<d3.PieArcDatum<{ id: string | number; value: number; [key: string]: any }>>()
    .innerRadius(radius * innerRadius)
    .outerRadius(radius * outerRadius)
    .cornerRadius(cornerRadius);

  const outerArc = d3.arc<d3.PieArcDatum<{ id: string | number; value: number; [key: string]: any }>>()
    .innerRadius(radius * 0.9)
    .outerRadius(radius * 0.9);

  const colorScale = d3.scaleOrdinal<string, string>()
    .domain(data.map(d => d.id.toString()))
    .range(colors || [
      THEMES_COLORS.prism.primary,
      THEMES_COLORS.prism.secondary,
      THEMES_COLORS.prism.accent,
      THEMES_COLORS.prism.success,
      THEMES_COLORS.prism.warning,
      THEMES_COLORS.prism.error,
      THEMES_COLORS.prism.info,
    ]);

  const showTooltip = useCallback((event: MouseEvent, d: d3.PieArcDatum<{ id: string | number; value: number; [key: string]: any }>) => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    tooltip.html(`
      <div style="background: ${THEMES_COLORS.prism.popover}; color: ${THEMES_COLORS.prism.popoverForeground}; padding: 8px 12px; border-radius: 4px; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);">
        <strong>${d.data.id}</strong><br/>
        <span>Value: ${d.value.toLocaleString()}</span><br/>
        <span>Percentage: ${(d.data.value / d3.sum(data, d => d.value) * 100).toFixed(2)}%</span>
        <div style="background: ${colorScale(d.data.id.toString())}; width: 15px; height: 15px; display: inline-block; margin-left: 5px; vertical-align: middle;"></div>
      </div>
    `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 20}px`)
      .style('opacity', 1);
  }, [data, colorScale]);

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current)
      .attr('width', effectiveWidth)
      .attr('height', effectiveHeight);

    svg.selectAll('*').remove(); // Clear previous render

    const g = svg.append('g')
      .attr('transform', `translate(${effectiveWidth / 2},${effectiveHeight / 2})`);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .enter().append('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('d', arc)
      .attr('fill', d => colorScale(d.data.id.toString()) as string)
      .attr('stroke', THEMES_COLORS.prism.border)
      .attr('stroke-width', 1)
      .on('click', (event: MouseEvent, d: d3.PieArcDatum<{ id: string | number; value: number; [key: string]: any }>) => onSliceClick?.(d.data, event as any))
      .on('mouseover', function(event: MouseEvent, d: d3.PieArcDatum<{ id: string | number; value: number; [key: string]: any }>) {
        d3.select(this as d3.BaseType).transition()
          .duration(200)
          .attr('transform', `scale(1.03)`)
          .attr('stroke-width', 2)
          .attr('stroke', THEMES_COLORS.prism.primary);
        showTooltip(event, d);
      })
      .on('mouseout', function() {
        d3.select(this as d3.BaseType).transition()
          .duration(100)
          .attr('transform', 'scale(1)')
          .attr('stroke-width', 1)
          .attr('stroke', THEMES_COLORS.prism.border);
        hideTooltip();
      });

    // Add labels
    arcs.append('text')
      .attr('transform', (d: d3.PieArcDatum<{ id: string | number; value: number; [key: string]: any }>) => `translate(${outerArc.centroid(d)})`)
      .attr('dy', '0.35em')
      .style('text-anchor', (d: d3.PieArcDatum<{ id: string | number; value: number; [key: string]: any }>) => (d.endAngle + d.startAngle) / 2 > Math.PI ? 'end' : 'start')
      .style('font-size', '10px')
      .style('fill', THEMES_COLORS.prism.foreground)
      .text((d: d3.PieArcDatum<{ id: string | number; value: number; [key: string]: any }>) => d.data.id.toString());

  }, [data, effectiveWidth, effectiveHeight, radius, arc, outerArc, pie, colorScale, onSliceClick, showTooltip, hideTooltip]);

  return (
    <div className={className} style={{ position: 'relative', width: effectiveWidth, height: effectiveHeight }}>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}></div>
    </div>
  );
};