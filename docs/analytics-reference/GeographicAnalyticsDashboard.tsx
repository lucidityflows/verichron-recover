import React, { useState } from 'react';
import { GeoMap } from '@verichron/ui-visualizations';
import { IGeographicStateData } from './geographic-analytics.interfaces';
import { GeographicControls, GeographicViewMode } from './GeographicControls';
import { GeographicInsightsPanel } from './GeographicInsightsPanel';
import { GeographicDrilldownModal } from './GeographicDrilldownModal';

export const GeographicAnalyticsDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<GeographicViewMode>('debtors');
  const [currentMetric, setCurrentMetric] = useState<string>('totalDebtValue');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStateData, setSelectedStateData] = useState<IGeographicStateData | null>(null);

  // Placeholder data for demonstration
  const mockGeographicData: IGeographicStateData[] = [
    { id: 'US-CA', stateCode: 'CA', stateName: 'California', totalDebtValue: 1200000, averageDebtValue: 12000, debtorCount: 100, coordinates: { latitude: 36.7783, longitude: -119.4179 } },
    { id: 'US-TX', stateCode: 'TX', stateName: 'Texas', totalDebtValue: 900000, averageDebtValue: 9000, debtorCount: 100, coordinates: { latitude: 31.9686, longitude: -99.9018 } },
    { id: 'US-NY', stateCode: 'NY', stateName: 'New York', totalDebtValue: 750000, averageDebtValue: 15000, debtorCount: 50, coordinates: { latitude: 43.2994, longitude: -74.2179 } },
    { id: 'US-FL', stateCode: 'FL', stateName: 'Florida', totalDebtValue: 600000, averageDebtValue: 10000, debtorCount: 60, coordinates: { latitude: 27.6648, longitude: -81.5158 } },
    { id: 'US-IL', stateCode: 'IL', stateName: 'Illinois', totalDebtValue: 400000, averageDebtValue: 8000, debtorCount: 50, coordinates: { latitude: 40.6331, longitude: -89.3985 } },
  ];

  const filteredData = mockGeographicData.map(d => ({ ...d, value: d[currentMetric as keyof IGeographicStateData] as number }));

  const handleStateClick = (stateId: string) => {
    const data = mockGeographicData.find(d => d.id === stateId);
    if (data) {
      setSelectedStateData(data);
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStateData(null);
  };

  return (
    <div className="p-4 bg-background rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Geographic Intelligence</h2>
      <GeographicControls
        currentView={currentView}
        onViewChange={setCurrentView}
        currentMetric={currentMetric}
        onMetricChange={setCurrentMetric}
      />
      <div className="mt-4">
        <GeoMap data={filteredData} metric={currentMetric} height={500} onStateClick={handleStateClick} />
      </div>
      <GeographicInsightsPanel data={mockGeographicData} metric={currentMetric} />

      <GeographicDrilldownModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        stateData={selectedStateData}
        metric={currentMetric}
      />
    </div>
  );
};
