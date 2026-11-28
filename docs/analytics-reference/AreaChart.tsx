import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { PRISM_COLORS } from '@verichron/ui-theming';

interface AreaChartProps {
  data: any[];
  dataKeys: string[];
  xAxisKey?: string;
  height?: number;
  width?: number;
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  customTooltip?: React.FC<any>; // Simplified for D3, will need custom implementation
  fillGradient?: boolean;
  strokeWidth?: number;
  className?: string;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  dataKeys,
  xAxisKey = 'name',
  height = 300,
  width = 600,
  colors,
  showLegend = false,
  showGrid = true,
  fillGradient = true,
  strokeWidth = 2,
  className
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const margin = { top: 10, right: 30, bottom: 40, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const defaultColors = colors || [
    PRISM_COLORS.primary,
    PRISM_COLORS.secondary,
    PRISM_COLORS.accent,
    PRISM_COLORS.success,
    PRISM_COLORS.warning,
    PRISM_COLORS.error,
    PRISM_COLORS.info,
  ];

  const colorScale = d3.scaleOrdinal<string, string>()
    .domain(dataKeys)
    .range(defaultColors);

  const showTooltip = useCallback((event: MouseEvent, d: any, key: string) => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    tooltip.html(`
      <div style="background: ${PRISM_COLORS.popover}; color: ${PRISM_COLORS.popoverForeground}; padding: 8px 12px; border-radius: 4px; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);">
        <strong>${xAxisKey}:</strong> ${d[xAxisKey]}<br/>
        <strong>${key}:</strong> $${d[key].toLocaleString()}
      </div>
    `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 20}px`)
      .style('opacity', 1);
  }, [xAxisKey]);

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
    const xScale = d3.scalePoint()
      .domain(data.map(d => d[xAxisKey]))
      .range([0, innerWidth])
      .padding(0.5);

    const xAxis = d3.axisBottom(xScale)
      .tickSize(5)
      .tickPadding(5);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', PRISM_COLORS.mutedForeground);

    g.append('text')
      .attr('transform', `translate(${innerWidth / 2},${innerHeight + margin.bottom - 5})`)
      .style('text-anchor', 'middle')
      .style('fill', PRISM_COLORS.foreground)
      .text(xAxisKey);

    // Y scale and axis
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d3.max(dataKeys, key => d[key])) || 0])
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
      .style('fill', PRISM_COLORS.mutedForeground);

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (innerHeight / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', PRISM_COLORS.foreground)
      .text('Value');

    // Grid lines
    if (showGrid) {
      g.append('g')
        .attr('class', 'grid')
        .attr('stroke', PRISM_COLORS.border)
        .attr('stroke-dasharray', '3 3')
        .call(d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat(() => ''));
    }

    // Area and Line generators
    const areaGenerator = d3.area<any>()
      .x(d => xScale(d[xAxisKey]) || 0)
      .y0(innerHeight)
      .y1(d => yScale(d.value));

    const lineGenerator = d3.line<any>()
      .x(d => xScale(d[xAxisKey]) || 0)
      .y(d => yScale(d.value));

    dataKeys.forEach((key, _i) => {
      const seriesData = data.map(d => ({ [xAxisKey]: d[xAxisKey], value: d[key] }));
      const seriesColor = colorScale(key);

      // Area
      g.append('path')
        .datum(seriesData)
        .attr('fill', fillGradient ? `url(#area-gradient-${key})` : seriesColor)
        .attr('fill-opacity', fillGradient ? 0.3 : 1)
        .attr('stroke', 'none')
        .attr('d', areaGenerator);

      // Gradient for area
      if (fillGradient) {
        const gradient = svg.append('defs').append('linearGradient')
          .attr('id', `area-gradient-${key}`)
          .attr('x1', '0%').attr('y1', '0%')
          .attr('x2', '0%').attr('y2', '100%');

        gradient.append('stop').attr('offset', '0%').attr('stop-color', seriesColor).attr('stop-opacity', 0.5);
        gradient.append('stop').attr('offset', '100%').attr('stop-color', seriesColor).attr('stop-opacity', 0);
      }

      // Line
      g.append('path')
        .datum(seriesData)
        .attr('fill', 'none')
        .attr('stroke', seriesColor)
        .attr('stroke-width', strokeWidth)
        .attr('d', lineGenerator);

      // Points and Tooltip interaction
      g.selectAll(`.dot-${key}`)
        .data(seriesData)
        .enter().append('circle')
        .attr('class', `dot-${key}`)
        .attr('cx', d => xScale(d[xAxisKey]) || 0)
        .attr('cy', d => yScale(d.value))
        .attr('r', 4)
        .attr('fill', seriesColor)
        .attr('stroke', PRISM_COLORS.background) // background
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('r', 6);
          showTooltip(event, d, key);
        })
        .on('mouseout', function() {
          d3.select(this).attr('r', 4);
          hideTooltip();
        });
    });

    // Legend
    if (showLegend) {
      const legend = g.append('g')
        .attr('transform', `translate(${innerWidth + 10}, 0)`);

      dataKeys.forEach((key, i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
          .attr('width', 10)
          .attr('height', 10)
          .attr('fill', colorScale(key));

        legendRow.append('text')
          .attr('x', 20)
          .attr('y', 10)
          .attr('text-anchor', 'start')
          .style('font-size', '12px')
          .style('fill', PRISM_COLORS.foreground)
          .text(key);
      });
    }

  }, [data, dataKeys, xAxisKey, height, width, colors, showLegend, showGrid, fillGradient, strokeWidth, showTooltip, hideTooltip]);

  return (
    <div className={className} style={{ width, height, position: 'relative' }}>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}></div>
    </div>
  );
};
