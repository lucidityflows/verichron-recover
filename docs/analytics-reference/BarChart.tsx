import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { THEMES_COLORS } from '@verichron/ui-theming';

interface BarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey?: string;
  height?: number;
  width?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  customTooltip?: React.FC<any>; // Simplified for D3, will need custom implementation
  onBarClick?: (datum: any, event: React.MouseEvent<SVGRectElement>) => void;
  className?: string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  dataKey,
  xAxisKey = 'name',
  height = 300,
  width = 600,
  colors,
  showLegend = false,
  showGrid = true,
  onBarClick,
  className
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const margin = { top: 20, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const defaultColors = colors || [
    THEMES_COLORS.prism.primary,
    THEMES_COLORS.prism.secondary,
    THEMES_COLORS.prism.accent,
    THEMES_COLORS.prism.success,
    THEMES_COLORS.prism.warning,
    THEMES_COLORS.prism.error,
    THEMES_COLORS.prism.info,
  ];

  const colorScale = d3.scaleOrdinal<string, string>()
    .domain([dataKey])
    .range(defaultColors);

  const showTooltip = useCallback((event: MouseEvent, d: any) => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    tooltip.html(`
      <div style="background: ${THEMES_COLORS.prism.popover}; color: ${THEMES_COLORS.prism.popoverForeground}; padding: 8px 12px; border-radius: 4px; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);">
        <strong>${xAxisKey}:</strong> ${d[xAxisKey]}<br/>
        <strong>${dataKey}:</strong> $${d[dataKey].toLocaleString()}
      </div>
    `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 20}px`)
      .style('opacity', 1);
  }, [xAxisKey, dataKey]);

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove(); // Clear previous render

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale and axis
    const xScale = d3.scaleBand()
      .domain(data.map(d => d[xAxisKey]))
      .range([0, innerWidth])
      .padding(0.3);

    const xAxis = d3.axisBottom(xScale)
      .tickSize(5)
      .tickPadding(5);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', THEMES_COLORS.prism.mutedForeground);

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2},${innerHeight + margin.bottom - 5})`)
      .style('text-anchor', 'middle')
      .style('fill', THEMES_COLORS.prism.foreground)
      .text(xAxisKey);

    // Y scale and axis
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d[dataKey]) || 0])
      .range([innerHeight, 0]);

    const yAxis = d3.axisLeft(yScale)
      .tickSize(5)
      .tickPadding(5)
      .tickFormat((value: d3.NumberValue) => {
        const numValue = value.valueOf();
        if (numValue >= 1000) {
          return `$${(numValue / 1000).toFixed(0)}k`;
        }
        return `$${numValue}`;
      });

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', THEMES_COLORS.prism.mutedForeground);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', THEMES_COLORS.prism.foreground)
      .text('Value');

    // Grid lines
    if (showGrid) {
      g.append('g')
        .attr('class', 'grid')
        .attr('stroke', THEMES_COLORS.prism.border)
        .attr('stroke-dasharray', '3 3')
        .call(d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => ''));
    }

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d[xAxisKey]) || 0)
      .attr('y', d => yScale(d[dataKey]))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(d[dataKey]))
      .attr('fill', colorScale(dataKey))
      .attr('rx', 4) // Border radius
      .attr('ry', 4)
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 0.8);
        showTooltip(event, d);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1);
        hideTooltip();
      })
      .on('click', function(event, d) {
        onBarClick?.(d, event as any);
      });

    // Legend
    if (showLegend) {
      const legend = g.append('g')
        .attr('transform', `translate(${innerWidth - 100}, 0)`);

      legend.append('rect')
        .attr('width', 10)
        .attr('height', 10)
        .attr('fill', colorScale(dataKey));

      legend.append('text')
        .attr('x', 20)
        .attr('y', 10)
        .attr('text-anchor', 'start')
        .style('font-size', '12px')
        .style('fill', THEMES_COLORS.prism.foreground)
        .text(dataKey);
    }

  }, [data, dataKey, xAxisKey, height, width, colors, showLegend, showGrid, onBarClick, showTooltip, hideTooltip]);

  return (
    <div className={className} style={{ width, height, position: 'relative' }}>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}></div>
    </div>
  );
};
