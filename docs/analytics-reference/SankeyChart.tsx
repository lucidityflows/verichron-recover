import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { THEMES_COLORS } from '@verichron/ui-theming';

type SankeyView = 'payment-type' | 'state' | 'demographic';

interface SankeyNodeDatum {
  id: string;
  color?: string;
  // D3-Sankey adds these properties
  index?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
  depth?: number;
  height?: number;
  sourceLinks?: SankeyLinkDatum[];
  targetLinks?: SankeyLinkDatum[];
}

interface SankeyLinkDatum {
  source: string | SankeyNodeDatum;
  target: string | SankeyNodeDatum;
  value: number;
  color?: string;
  // D3-Sankey adds these properties
  index?: number;
  y0?: number;
  y1?: number;
  width?: number;
}

interface SankeyChartProps {
  data: {
    nodes: { id: string; color?: string }[];
    links: { source: string; target: string; value: number; color?: string }[];
  };
  currentView?: SankeyView;
  height?: number;
  width?: number;
  nodeWidth?: number;
  nodePadding?: number;
  linkOpacity?: number;
  linkOpacityHover?: number;
  nodeOpacity?: number;
  nodeOpacityHover?: number;
  enableLinkGradient?: boolean;
}

export const SankeyChart: React.FC<SankeyChartProps> = ({
  data,
  height = 500,
  width = 900,
  nodeWidth = 18,
  nodePadding = 24,
  linkOpacity = 0.5,
  linkOpacityHover = 0.7,
  nodeOpacity = 1,
  nodeOpacityHover = 0.7,
  enableLinkGradient = true,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const defaultColors = [
    THEMES_COLORS.prism.primary,
    THEMES_COLORS.prism.secondary,
    THEMES_COLORS.prism.accent,
    THEMES_COLORS.prism.success,
    THEMES_COLORS.prism.warning,
    THEMES_COLORS.prism.error,
    THEMES_COLORS.prism.info,
  ];

  const colorScale = d3.scaleOrdinal<string, string>()
    .range(defaultColors);

  const showTooltip = useCallback((event: MouseEvent, d: SankeyNodeDatum | SankeyLinkDatum, type: 'node' | 'link') => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    let content = '';

    if (type === 'node') {
      const node = d as SankeyNodeDatum;
      content = `
        <strong>${node.id}</strong><br/>
        <span>Value: ${node.value?.toLocaleString()}</span>
      `;
    } else if (type === 'link') {
      const link = d as SankeyLinkDatum;
      content = `
        <strong>${(link.source as SankeyNodeDatum).id} → ${(link.target as SankeyNodeDatum).id}</strong><br/>
        <span>Value: ${link.value?.toLocaleString()}</span>
      `;
    }

    tooltip.html(`
      <div style="background: ${THEMES_COLORS.prism.popover}; color: ${THEMES_COLORS.prism.popoverForeground}; padding: 8px 12px; border-radius: 4px; box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);">
        ${content}
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
    if (!svgRef.current || !data || data.nodes.length === 0) {
      return;
    }

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove(); // Clear previous render

    const g = svg.append('g');

    const sankeyGenerator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([[1, 1], [width - 1, height - 5]]); // Adjusted extent for better fit

    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d })),
    });

    // Define gradients for links
    if (enableLinkGradient) {
      const defs = svg.append('defs');

      links.forEach((link, i) => {
        const gradient = defs.append('linearGradient')
          .attr('id', `linkGradient-${i}`)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', (link.source as SankeyNodeDatum).x1 || 0)
          .attr('y1', (link.source as SankeyNodeDatum).y0 || 0)
          .attr('x2', (link.target as SankeyNodeDatum).x0 || 0)
          .attr('y2', (link.target as SankeyNodeDatum).y1 || 0);

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', colorScale((link.source as SankeyNodeDatum).id));
        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', colorScale((link.target as SankeyNodeDatum).id));
      });
    }

    // Draw links
    g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d, i) => enableLinkGradient ? `url(#linkGradient-${i})` : colorScale((d.source as SankeyNodeDatum).id))
      .attr('stroke-width', d => Math.max(1, d.width || 0))
      .attr('fill', 'none')
      .attr('opacity', linkOpacity)
      .on('mouseover', function(event, d: SankeyLinkDatum) {
        d3.select(this).attr('opacity', linkOpacityHover);
        showTooltip(event, d, 'link');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', linkOpacity);
        hideTooltip();
      });

    // Draw nodes
    g.append('g')
      .attr('class', 'nodes')
      .selectAll('rect')
      .data(nodes)
      .join('rect')
      .attr('x', d => d.x0 || 0)
      .attr('y', d => d.y0 || 0)
      .attr('height', d => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', d => (d.x1 || 0) - (d.x0 || 0))
      .attr('fill', d => colorScale(d.id))
      .attr('stroke', THEMES_COLORS.prism.border)
      .attr('stroke-width', 1)
      .attr('opacity', nodeOpacity)
      .on('mouseover', function(event, d: SankeyNodeDatum) {
        d3.select(this).attr('opacity', nodeOpacityHover);
        showTooltip(event, d, 'node');
      })
      .on('mouseout', function() {
        d3.select(this).attr('opacity', nodeOpacity);
        hideTooltip();
      });

    // Add node labels
    g.append('g')
      .attr('class', 'node-labels')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('x', d => (d.x0 || 0) < width / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6)
      .attr('y', d => ((d.y1 || 0) + (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', d => (d.x0 || 0) < width / 2 ? 'start' : 'end')
      .style('font-size', '12px')
      .style('fill', THEMES_COLORS.prism.foreground)
      .text(d => d.id);

  }, [data, height, width, nodeWidth, nodePadding, linkOpacity, linkOpacityHover, nodeOpacity, nodeOpacityHover, enableLinkGradient, showTooltip, hideTooltip]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <svg ref={svgRef}></svg>
      <div ref={tooltipRef} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}></div>
    </div>
  );
};
