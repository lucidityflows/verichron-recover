import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { Feature, GeoJsonProperties, Geometry } from 'geojson';
import { THEMES_COLORS } from '@verichron/ui-theming';

// Nivo requires a topology file for geographic data
// This is a placeholder for the US states topology
const usStatesTopologyUrl = 'https://raw.githubusercontent.com/plouc/nivo/master/website/src/data/components/geo/usa.json';

interface GeoMapProps {
  data: Array<{ id: string; value: number; [key: string]: any }>;
  metric: string; // The metric being displayed (e.g., "debtorCount", "totalDebtValue")
  height?: number;
  width?: number;
  colors?: string[]; // Optional custom color scale
  showLegend?: boolean;
  className?: string;
  onStateClick?: (stateId: string) => void; // New prop for click handler
}

interface StateFeature extends Feature {
  id: string;
  properties: GeoJsonProperties & { name: string };
  geometry: Geometry;
}

export const GeoMap: React.FC<GeoMapProps> = ({
  data,
  metric,
  height = 500,
  width = 960,
  colors,
  showLegend = true,
  className,
  onStateClick,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [topology, setTopology] = useState<any>(null);

  useEffect(() => {
    fetch(usStatesTopologyUrl)
      .then(response => response.json())
      .then(data => setTopology(data))
      .catch(error => console.error('Error loading geography data:', error));
  }, []);

// Removed unused 'defaultColors' constant

  const showTooltip = useCallback((event: MouseEvent, d: { properties: GeoJsonProperties & { name: string }, value: number | undefined }) => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    tooltip.html(`
      <div style="background: ${THEMES_COLORS.prism.popover}; color: ${THEMES_COLORS.prism.popoverForeground}; padding: 8px 12px; border-radius: 4px; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);">
        <strong>${d.properties.name}</strong><br/>
        <span>${metric}: ${d.value !== undefined ? d.value.toLocaleString() : 'N/A'}</span>
      </div>
    `)
      .style('left', `${event.pageX + 10}px`)
      .style('top', `${event.pageY - 20}px`)
      .style('opacity', 1);
  }, [metric]);

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || !topology || !data) {
      return;
    }

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove(); // Clear previous render

    const projection = d3.geoAlbersUsa()
      .scale(width * 1.2) // Adjust scale based on width
      .translate([width / 2, height / 2]);

    const path = d3.geoPath<any, StateFeature>()
      .projection(projection);

    const maxValue = d3.max(data, d => d.value) || 100;
    const colorScale = d3.scaleSequential(d3.interpolateRgb(THEMES_COLORS.prism.muted, THEMES_COLORS.prism.primary))
      .domain([0, maxValue]);

    // Merge data with topology
    const dataMap = new Map(data.map(d => [d.id, d.value]));

    svg.append('g')
      .attr('class', 'states')
      .selectAll('path')
      .data<StateFeature>(topology.features)
      .join('path')
      .attr('d', path)
      .attr('fill', (d: StateFeature) => {
        const value = dataMap.get(d.id);
        return value !== undefined ? colorScale(value) : THEMES_COLORS.prism.muted;
      })
      .attr('stroke', THEMES_COLORS.prism.border)
      .attr('stroke-width', 0.5)
      .on('mouseover', function(event, d: StateFeature) {
        d3.select(this).attr('fill', d3.color(d3.select(this).attr('fill'))?.darker(0.5)?.toString() || THEMES_COLORS.prism.primary);
        showTooltip(event, { properties: d.properties, value: dataMap.get(d.id) });
      })
      .on('mouseout', function(_event, _d) {
        if (this instanceof SVGPathElement) {
          d3.select<SVGPathElement, StateFeature>(this).attr('fill', (d_datum: StateFeature) => {
            const value = dataMap.get(d_datum.id);
            return value !== undefined ? colorScale(value) : THEMES_COLORS.prism.muted;
          });
        } else {
          console.warn("Expected 'this' to be an SVGPathElement, but it was not.");
        }
        hideTooltip();
      })
      .on('click', (d: StateFeature) => onStateClick?.(d.id));

    // Graticule
    svg.append('path')
      .datum(d3.geoGraticule())
      .attr('class', 'graticule')
      .attr('d', path as any)
      .attr('fill', 'none')
      .attr('stroke', THEMES_COLORS.prism.border)
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.5);

    // Legend
    if (showLegend) {
      const legendWidth = 20;
      const legendHeight = height / 2;

      const legendScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([legendHeight, 0]);

      const legendAxis = d3.axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format("~s"));

      const legend = svg.append('g')
        .attr('transform', `translate(${width - legendWidth - 20}, ${height / 2 - legendHeight / 2})`);

      legend.append('g')
        .attr('class', 'legend-axis')
        .call(legendAxis)
        .selectAll('text')
        .style('fill', THEMES_COLORS.prism.foreground);

      const linearGradient = legend.append('defs')
        .append('linearGradient')
        .attr('id', 'linear-gradient')
        .attr('x1', '0%')
        .attr('y1', '100%')
        .attr('x2', '0%')
        .attr('y2', '0%');

      // Generate stops for the gradient based on the color scale's domain
      const numStops = 10; // Number of stops for the gradient
      const stopData = d3.range(numStops).map(i => {
        const value = (maxValue / (numStops - 1)) * i;
        return { offset: i / (numStops - 1), color: colorScale(value) };
      });

      linearGradient.selectAll('stop')
        .data(stopData)
        .enter().append('stop')
        .attr('offset', d => d.offset)
        .attr('stop-color', d => d.color);

      legend.append('rect')
        .attr('width', legendWidth)
        .attr('height', legendHeight)
        .style('fill', 'url(#linear-gradient)');
    }

  }, [data, topology, height, width, colors, showLegend, metric, onStateClick, showTooltip, hideTooltip]);

  if (!topology) {
    return <div className="flex items-center justify-center h-full text-gray-500">Loading map data...</div>;
  }

  return (
    <div className={className} style={{ width, height, position: 'relative' }}>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}></div>
    </div>
  );
};