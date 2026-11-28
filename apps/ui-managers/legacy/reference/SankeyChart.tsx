import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import type { FlowAnalyticsResponseDto } from '@/api/generated/organizations_models';

interface SankeyNodeDatum {
  id: string;
  label: string;
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
  percentage?: number;
  color?: string;
  // D3-Sankey adds these properties
  index?: number;
  y0?: number;
  y1?: number;
  width?: number;
}

interface SankeyChartProps {
  data: FlowAnalyticsResponseDto | null;
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

/**
 * Adapter function: Convert API response to D3-Sankey format
 */
function adaptFlowDataToSankey(apiData: FlowAnalyticsResponseDto): {
  nodes: SankeyNodeDatum[];
  links: SankeyLinkDatum[];
} {
  return {
    nodes: apiData.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      // Value will be computed by d3-sankey from links
    })),
    links: apiData.links.map((link) => ({
      source: link.source,
      target: link.target,
      value: parseFloat(link.value),
      percentage: link.percentage,
    })),
  };
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

  // Vibrant, distinguishable color palette optimized for flow visualizations
  const getColor = useCallback((index: number) => {
    const colors = [
      '#3b82f6', // blue-500 (bright, professional)
      '#10b981', // emerald-500 (distinct green)
      '#f59e0b', // amber-500 (warm orange)
      '#8b5cf6', // violet-500 (purple contrast)
      '#ef4444', // red-500 (attention)
      '#06b6d4', // cyan-500 (cool blue)
      '#ec4899', // pink-500 (distinct pink)
      '#14b8a6', // teal-500 (blue-green)
      '#f97316', // orange-500 (bright orange)
      '#a855f7', // purple-500 (deeper purple)
      '#22c55e', // green-500 (bright green)
      '#eab308', // yellow-500 (bright yellow)
    ];
    return colors[index % colors.length];
  }, []);

  const colorScale = d3.scaleOrdinal<string, string>().range(
    Array.from({ length: 20 }, (_, i) => getColor(i))
  );

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const showTooltip = useCallback(
    (
      event: MouseEvent,
      d: SankeyNodeDatum | SankeyLinkDatum,
      type: 'node' | 'link'
    ) => {
      if (!tooltipRef.current) return;

      const tooltip = d3.select(tooltipRef.current);
      let content = '';

      if (type === 'node') {
        const node = d as SankeyNodeDatum;
        content = `
        <div class="font-semibold text-[var(--color-foreground)]">${node.label}</div>
        <div class="text-sm text-muted-foreground mt-1">
          Value: ${formatCurrency(node.value || 0)}
        </div>
      `;
      } else if (type === 'link') {
        const link = d as SankeyLinkDatum;
        const percentage = link.percentage?.toFixed(1) || '0.0';
        content = `
        <div class="font-semibold text-[var(--color-foreground)]">
          ${(link.source as SankeyNodeDatum).label} → ${(link.target as SankeyNodeDatum).label}
        </div>
        <div class="text-sm text-muted-foreground mt-1">
          Value: ${formatCurrency(link.value || 0)}
        </div>
        <div class="text-sm text-muted-foreground">
          ${percentage}% of total
        </div>
      `;
      }

      tooltip
        .html(
          `<div class="bg-[var(--color-popover)] text-[var(--color-popover-foreground)] px-3 py-2 rounded-lg shadow-lg border border-[var(--color-border)]">${content}</div>`
        )
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 20}px`)
        .style('opacity', 1);
    },
    [formatCurrency]
  );

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data || data.nodes.length === 0) {
      return;
    }

    const sankeyData = adaptFlowDataToSankey(data);

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove(); // Clear previous render

    const g = svg.append('g');

    const sankeyGenerator = sankey<SankeyNodeDatum, SankeyLinkDatum>()
      .nodeId((d: any) => d.id)
      .nodeWidth(nodeWidth)
      .nodePadding(nodePadding)
      .extent([
        [1, 1],
        [width - 1, height - 5],
      ]);

    const { nodes, links } = sankeyGenerator({
      nodes: sankeyData.nodes.map((d) => ({ ...d })),
      links: sankeyData.links.map((d) => ({ ...d })),
    });

    // Define gradients for links
    if (enableLinkGradient) {
      const defs = svg.append('defs');

      links.forEach((link, i) => {
        const gradient = defs
          .append('linearGradient')
          .attr('id', `linkGradient-${i}`)
          .attr('gradientUnits', 'userSpaceOnUse')
          .attr('x1', (link.source as SankeyNodeDatum).x1 || 0)
          .attr('y1', (link.source as SankeyNodeDatum).y0 || 0)
          .attr('x2', (link.target as SankeyNodeDatum).x0 || 0)
          .attr('y2', (link.target as SankeyNodeDatum).y1 || 0);

        gradient
          .append('stop')
          .attr('offset', '0%')
          .attr('stop-color', colorScale((link.source as SankeyNodeDatum).id));
        gradient
          .append('stop')
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
      .attr('stroke', (d, i) =>
        enableLinkGradient
          ? `url(#linkGradient-${i})`
          : colorScale((d.source as SankeyNodeDatum).id)
      )
      .attr('stroke-width', (d) => Math.max(1, d.width || 0))
      .attr('fill', 'none')
      .attr('opacity', linkOpacity)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d: SankeyLinkDatum) {
        d3.select(this).attr('opacity', linkOpacityHover);
        showTooltip(event, d, 'link');
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', linkOpacity);
        hideTooltip();
      });

    // Draw nodes
    g.append('g')
      .attr('class', 'nodes')
      .selectAll('rect')
      .data(nodes)
      .join('rect')
      .attr('x', (d) => d.x0 || 0)
      .attr('y', (d) => d.y0 || 0)
      .attr('height', (d) => (d.y1 || 0) - (d.y0 || 0))
      .attr('width', (d) => (d.x1 || 0) - (d.x0 || 0))
      .attr('fill', (d) => colorScale(d.id))
      .attr('stroke', 'hsl(var(--color-border))')
      .attr('stroke-width', 1)
      .attr('opacity', nodeOpacity)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d: SankeyNodeDatum) {
        d3.select(this).attr('opacity', nodeOpacityHover);
        showTooltip(event, d, 'node');
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', nodeOpacity);
        hideTooltip();
      });

    // Add node labels with improved readability
    g.append('g')
      .attr('class', 'node-labels')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .attr('x', (d) => ((d.x0 || 0) < width / 2 ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6))
      .attr('y', (d) => ((d.y1 || 0) + (d.y0 || 0)) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d) => ((d.x0 || 0) < width / 2 ? 'start' : 'end'))
      .style('font-size', '12px')
      .style('fill', 'hsl(var(--color-foreground))')
      .style('font-weight', '600')
      .style('text-shadow', '0 1px 3px rgba(0, 0, 0, 0.5), 0 0 4px rgba(255, 255, 255, 0.8)')
      .style('paint-order', 'stroke fill')
      .style('stroke', 'rgba(255, 255, 255, 0.9)')
      .style('stroke-width', '3px')
      .style('stroke-linejoin', 'round')
      .text((d) => d.label);

    // Add percentage labels on links (only for links > 5%) with improved readability
    g.append('g')
      .attr('class', 'link-labels')
      .selectAll('text')
      .data(links.filter((d) => (d.percentage || 0) > 5))
      .join('text')
      .attr('x', (d) => {
        const sourceX = (d.source as SankeyNodeDatum).x1 || 0;
        const targetX = (d.target as SankeyNodeDatum).x0 || 0;
        return (sourceX + targetX) / 2;
      })
      .attr('y', (d) => {
        const sourceNode = d.source as SankeyNodeDatum;
        const targetNode = d.target as SankeyNodeDatum;
        const sourceY =
          (sourceNode.y0 || 0) +
          ((sourceNode.y1 || 0) - (sourceNode.y0 || 0)) / 2;
        const targetY =
          (targetNode.y0 || 0) +
          ((targetNode.y1 || 0) - (targetNode.y0 || 0)) / 2;
        return (sourceY + targetY) / 2;
      })
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('fill', '#1f2937')
      .style('font-weight', '700')
      .style('pointer-events', 'none')
      .style('text-shadow', '0 1px 2px rgba(0, 0, 0, 0.4), 0 0 6px rgba(255, 255, 255, 1)')
      .style('paint-order', 'stroke fill')
      .style('stroke', 'rgba(255, 255, 255, 1)')
      .style('stroke-width', '4px')
      .style('stroke-linejoin', 'round')
      .text((d) => `${d.percentage?.toFixed(1)}%`);
  }, [
    data,
    height,
    width,
    nodeWidth,
    nodePadding,
    linkOpacity,
    linkOpacityHover,
    nodeOpacity,
    nodeOpacityHover,
    enableLinkGradient,
    showTooltip,
    hideTooltip,
    colorScale,
  ]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <svg ref={svgRef}></svg>
      <div
        ref={tooltipRef}
        style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', zIndex: 1000 }}
      ></div>
    </div>
  );
};
