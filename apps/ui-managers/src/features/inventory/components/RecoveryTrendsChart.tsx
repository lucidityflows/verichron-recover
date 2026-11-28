import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { RecoveryTrendDataPointDto } from '@/api/generated/organizations_models';

interface RecoveryTrendsChartProps {
  data: RecoveryTrendDataPointDto[];
  height?: number;
  width?: number;
}

export const RecoveryTrendsChart: React.FC<RecoveryTrendsChartProps> = ({
  data,
  height = 400,
  width = 800,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const margin = { top: 20, right: 30, bottom: 60, left: 70 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const showTooltip = (event: MouseEvent, d: RecoveryTrendDataPointDto, metricLabel: string) => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);

    tooltip.html(`
      <div style="background: var(--color-popover); color: var(--color-popover-foreground); padding: 8px 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 1px solid var(--color-border); font-size: 12px;">
        <div style="font-weight: 600; margin-bottom: 4px;">${d.period}</div>
        <div><strong>${metricLabel}:</strong> ${d.recoveryRate.toFixed(1)}%</div>
        <div style="margin-top: 4px; color: var(--color-muted-foreground);">
          Collected: $${parseFloat(d.amountCollected).toLocaleString()}
        </div>
        <div style="color: var(--color-muted-foreground);">
          Principal: $${parseFloat(d.principalOwed).toLocaleString()}
        </div>
      </div>
    `)
      .style('left', `${event.pageX + 15}px`)
      .style('top', `${event.pageY + 15}px`)
      .transition()
      .duration(100)
      .style('opacity', 1);
  };

  const hideTooltip = () => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).transition().duration(100).style('opacity', 0);
    }
  };

  useEffect(() => {
    if (!svgRef.current || !data || data.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale and axis
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.period))
      .range([0, innerWidth])
      .padding(0.5);

    const xAxis = d3.axisBottom(xScale)
      .tickSize(5)
      .tickPadding(10);

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', 'var(--color-muted-foreground)')
      .style('font-size', '12px')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    // Y scale and axis (for recovery rate %)
    const yScaleRate = d3.scaleLinear()
      .domain([0, Math.max(d3.max(data, d => d.recoveryRate) || 0, 50)])
      .range([innerHeight, 0]);

    const yAxisRate = d3.axisLeft(yScaleRate)
      .tickSize(5)
      .tickPadding(10)
      .tickFormat(d => `${Number(d).toFixed(0)}%`);

    g.append('g')
      .call(yAxisRate)
      .selectAll('text')
      .style('fill', 'var(--color-muted-foreground)')
      .style('font-size', '12px');

    // Y axis label (left)
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -(innerHeight / 2))
      .style('text-anchor', 'middle')
      .style('fill', 'var(--color-foreground)')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Recovery Rate (%)');

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-dasharray', '3 3')
      .attr('opacity', 0.5)
      .call(d3.axisLeft(yScaleRate)
        .tickSize(-innerWidth)
        .tickFormat(() => ''));

    // Area and Line for Recovery Rate
    const areaGenerator = d3.area<RecoveryTrendDataPointDto>()
      .x(d => xScale(d.period) || 0)
      .y0(innerHeight)
      .y1(d => yScaleRate(d.recoveryRate))
      .curve(d3.curveMonotoneX);

    const lineGenerator = d3.line<RecoveryTrendDataPointDto>()
      .x(d => xScale(d.period) || 0)
      .y(d => yScaleRate(d.recoveryRate))
      .curve(d3.curveMonotoneX);

    // Gradient for area
    const gradient = svg.append('defs').append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');

    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'var(--color-primary)')
      .attr('stop-opacity', 0.5);
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'var(--color-primary)')
      .attr('stop-opacity', 0);

    // Area
    g.append('path')
      .datum(data)
      .attr('fill', 'url(#area-gradient)')
      .attr('stroke', 'none')
      .attr('d', areaGenerator);

    // Line
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-primary)')
      .attr('stroke-width', 3)
      .attr('d', lineGenerator);

    // Points with tooltip
    g.selectAll('.dot-rate')
      .data(data)
      .enter().append('circle')
      .attr('class', 'dot-rate')
      .attr('cx', d => xScale(d.period) || 0)
      .attr('cy', d => yScaleRate(d.recoveryRate))
      .attr('r', 5)
      .attr('fill', 'var(--color-primary)')
      .attr('stroke', 'var(--color-background)')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 7);
        showTooltip(event, d, 'Recovery Rate');
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 5);
        hideTooltip();
      });

  }, [data, height, width, innerWidth, innerHeight]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: 10 }}></div>
    </div>
  );
};
