import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { DebtorGeographicStateDataDto } from '@/api/generated/organizations_models';
import { StateAbbreviation } from '@/api/generated/organizations_models';

interface USChoroplethMapProps {
  data: DebtorGeographicStateDataDto[];
  metric: keyof DebtorGeographicStateDataDto;
  height?: number;
  width?: number;
  onStateClick?: (stateCode: StateAbbreviation) => void;
}

// State FIPS code to abbreviation mapping
const FIPS_TO_STATE: Record<string, string> = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO', '09': 'CT', '10': 'DE',
  '12': 'FL', '13': 'GA', '15': 'HI', '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS',
  '21': 'KY', '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN', '28': 'MS',
  '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH', '34': 'NJ', '35': 'NM', '36': 'NY',
  '37': 'NC', '38': 'ND', '39': 'OH', '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC',
  '46': 'SD', '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA', '54': 'WV',
  '55': 'WI', '56': 'WY', '11': 'DC', '72': 'PR',
};

export const USChoroplethMap: React.FC<USChoroplethMapProps> = ({
  data,
  metric,
  height = 500,
  width = 900,
  onStateClick,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [usTopology, setUsTopology] = useState<any>(null);
  const [isLoadingMap, setIsLoadingMap] = useState(true);

  const formatValue = useCallback((value: number, metricKey: string) => {
    if (metricKey.includes('Value') || metricKey.includes('Debt')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    } else if (metricKey.includes('Rate') || metricKey.includes('recovery')) {
      return `${value.toFixed(1)}%`;
    }
    return value.toLocaleString();
  }, []);

  const showTooltip = useCallback(
    (event: MouseEvent, stateData: DebtorGeographicStateDataDto) => {
      if (!tooltipRef.current) return;

      const tooltip = d3.select(tooltipRef.current);
      const value = stateData[metric] as number;

      const content = `
        <div class="font-semibold text-[var(--color-foreground)]">${stateData.stateName}</div>
        <div class="text-sm text-muted-foreground mt-1">
          ${metric}: ${formatValue(value, metric)}
        </div>
        <div class="text-xs text-muted-foreground mt-1">
          Debtors: ${stateData.debtorCount?.toLocaleString() || 'N/A'}
        </div>
      `;

      tooltip
        .html(
          `<div class="bg-[var(--color-popover)] text-[var(--color-popover-foreground)] px-3 py-2 rounded-lg shadow-lg border border-[var(--color-border)]">${content}</div>`
        )
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 20}px`)
        .style('opacity', 1);
    },
    [metric, formatValue]
  );

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) {
      d3.select(tooltipRef.current).style('opacity', 0);
    }
  }, []);

  // Load US state topology data
  useEffect(() => {
    const loadTopology = async () => {
      try {
        setIsLoadingMap(true);
        const response = await fetch('https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json');
        const topology = await response.json();
        setUsTopology(topology);
      } catch (error) {
        console.error('Failed to load US topology:', error);
      } finally {
        setIsLoadingMap(false);
      }
    };

    loadTopology();
  }, []);

  useEffect(() => {
    if (!svgRef.current || data.length === 0 || !usTopology) {
      return;
    }

    const svg = d3
      .select(svgRef.current)
      .attr('width', width)
      .attr('height', height);

    svg.selectAll('*').remove();

    // Create a data map by state code for quick lookup
    const dataByState = new Map(
      data.map((d) => [d.stateCode, d])
    );

    // Create color scale based on metric values
    const values = data.map((d) => d[metric] as number).filter(v => v > 0);
    const colorScale = d3
      .scaleSequential(d3.interpolateBlues)
      .domain([0, d3.max(values) || 0]);

    // Setup projection
    const projection = d3
      .geoAlbersUsa()
      .scale(1100)
      .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    const g = svg.append('g');

    // Convert TopoJSON to GeoJSON features
    const statesGeoJson = feature(usTopology, usTopology.objects.states) as FeatureCollection<Geometry> | Feature<Geometry>;
    const states: Array<Feature<Geometry>> = 'features' in statesGeoJson ? statesGeoJson.features : [statesGeoJson];

    // Render state paths
    g.selectAll('path')
      .data(states)
      .join('path')
      .attr('d', path as any)
      .attr('fill', (d: any) => {
        const stateCode = FIPS_TO_STATE[d.id] as StateAbbreviation;
        const stateData = dataByState.get(stateCode);
        if (!stateData) {
          return '#e5e7eb'; // Light gray for states with no data
        }
        const value = stateData[metric] as number;
        return value > 0 ? colorScale(value) : '#e5e7eb';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0.9)
      .style('cursor', (d: any) => {
        const stateCode = FIPS_TO_STATE[d.id] as StateAbbreviation;
        return dataByState.has(stateCode) ? 'pointer' : 'default';
      })
      .on('mouseover', function (event, d: any) {
        const stateCode = FIPS_TO_STATE[d.id] as StateAbbreviation;
        const stateData = dataByState.get(stateCode);
        if (stateData) {
          d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', 2)
            .attr('stroke', '#000');
          showTooltip(event, stateData);
        }
      })
      .on('mouseout', function (event, d: any) {
        const stateCode = FIPS_TO_STATE[d.id] as StateAbbreviation;
        const stateData = dataByState.get(stateCode);
        if (stateData) {
          d3.select(this)
            .attr('opacity', 0.9)
            .attr('stroke-width', 0.5)
            .attr('stroke', '#fff');
          hideTooltip();
        }
      })
      .on('click', function (event, d: any) {
        const stateCode = FIPS_TO_STATE[d.id] as StateAbbreviation;
        const stateData = dataByState.get(stateCode);
        if (stateData && onStateClick) {
          onStateClick(stateData.stateCode);
        }
      });

  }, [data, metric, height, width, showTooltip, hideTooltip, onStateClick, usTopology]);

  if (isLoadingMap) {
    return (
      <div style={{ width, height, position: 'relative' }} className="flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    );
  }

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
