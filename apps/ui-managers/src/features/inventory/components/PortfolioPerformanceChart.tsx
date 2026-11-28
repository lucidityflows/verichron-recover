import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import type { PortfolioPerformanceDto } from '@/api/generated/organizations_models';

interface PortfolioPerformanceChartProps {
  data: PortfolioPerformanceDto[];
  height?: number;
  width?: number;
}

export const PortfolioPerformanceChart: React.FC<PortfolioPerformanceChartProps> = ({
  data,
  height = 400,
  width = 800,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const margin = { top: 20, right: 30, bottom: 100, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const showTooltip = useCallback((event: MouseEvent, d: PortfolioPerformanceDto) => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    const collected = parseFloat(d.totalCollected);
    tooltip.html(`
      <div style="background: var(--color-popover); color: var(--color-popover-foreground); padding: 8px 12px; border-radius: 6px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); border: 1px solid var(--color-border);">
        <div style="font-weight: 600; margin-bottom: 4px;">${d.portfolioName}</div>
        <div><strong>Total Collected:</strong> $${collected.toLocaleString()}</div>
        <div><strong>Recovery Rate:</strong> ${d.recoveryRate.toFixed(1)}%</div>
      </div>
    `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 20}px`)
      .style('opacity', 1);
  }, []);

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

    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X scale and axis
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.portfolioName))
      .range([0, innerWidth])
      .padding(0.3);

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

    // Y scale and axis
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => parseFloat(d.totalCollected)) || 0])
      .range([innerHeight, 0])
      .nice();

    const yAxis = d3.axisLeft(yScale)
      .tickSize(5)
      .tickPadding(10)
      .tickFormat((value: d3.NumberValue) => {
        const numValue = value.valueOf();
        if (numValue >= 1000000) {
          return `$${(numValue / 1000000).toFixed(1)}M`;
        } else if (numValue >= 1000) {
          return `$${(numValue / 1000).toFixed(0)}K`;
        }
        return `$${numValue}`;
      });

    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', 'var(--color-muted-foreground)')
      .style('font-size', '12px');

    // Y axis label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -(innerHeight / 2))
      .style('text-anchor', 'middle')
      .style('fill', 'var(--color-foreground)')
      .style('font-size', '14px')
      .style('font-weight', '500')
      .text('Total Collected ($)');

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-dasharray', '3 3')
      .attr('opacity', 0.5)
      .call(d3.axisLeft(yScale)
        .tickSize(-innerWidth)
        .tickFormat(() => ''));

    // Color scale based on recovery rate
    const colorScale = d3.scaleSequential()
      .domain([0, d3.max(data, d => d.recoveryRate) || 1])
      .interpolator(d3.interpolateBlues);

    // Bars
    g.selectAll('.bar')
      .data(data)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.portfolioName) || 0)
      .attr('y', d => yScale(parseFloat(d.totalCollected)))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerHeight - yScale(parseFloat(d.totalCollected)))
      .attr('fill', d => colorScale(d.recoveryRate))
      .attr('rx', 4)
      .attr('ry', 4)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        d3.select(this).attr('opacity', 0.8);
        showTooltip(event, d);
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', 1);
        hideTooltip();
      });

    // Value labels on top of bars
    g.selectAll('.label')
      .data(data)
      .enter().append('text')
      .attr('class', 'label')
      .attr('x', d => (xScale(d.portfolioName) || 0) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(parseFloat(d.totalCollected)) - 5)
      .attr('text-anchor', 'middle')
      .style('fill', 'var(--color-foreground)')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .text(d => {
        const value = parseFloat(d.totalCollected);
        if (value >= 1000000) {
          return `$${(value / 1000000).toFixed(1)}M`;
        } else if (value >= 1000) {
          return `$${(value / 1000).toFixed(0)}K`;
        }
        return `$${value}`;
      });

  }, [data, height, width, innerWidth, innerHeight, showTooltip, hideTooltip]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: 10 }}></div>
    </div>
  );
};
