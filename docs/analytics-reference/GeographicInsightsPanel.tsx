import React from 'react';
import { IGeographicStateData } from './geographic-analytics.interfaces';

interface GeographicInsightsPanelProps {
  data: IGeographicStateData[];
  metric: string;
}

export const GeographicInsightsPanel: React.FC<GeographicInsightsPanelProps> = ({
  data,
  metric,
}) => {
  return (
    <div className="p-4 bg-card rounded-lg shadow-sm mt-4">
      <h3 className="text-lg font-semibold">Insights for {metric}</h3>
      <ul className="list-disc list-inside">
        {data.slice(0, 3).map((state, index) => (
          <li key={index}>{state.stateName}: {state[metric as keyof IGeographicStateData]?.toLocaleString() || 'N/A'}</li>
        ))}
      </ul>
    </div>
  );
};