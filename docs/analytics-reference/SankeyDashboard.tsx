import React, { useState, useEffect } from 'react';
import { CreditCard, MapPin, Users, Activity, DollarSign, Target } from 'lucide-react';
import { SankeyChart } from '@verichron/ui-visualizations';

import { SankeyViewSelector } from './SankeyViewSelector';
import { SankeyView, SankeyData, SankeyLink } from './sankey.types';

// Placeholder for useCompanyAnalytics hook and formatCurrency utility
// In a real application, these would be imported from their respective locations
const useCompanyAnalytics = (_: { enableRealTime: boolean; autoStart: boolean }) => {
  const [sankeyView, setSankeyView] = useState<SankeyView>('payment-type');
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);

  // Mock data generation based on view
  useEffect(() => {
    // This would typically call an API or a data generator
    const generateMockSankeyData = (view: SankeyView): SankeyData => {
      // This is a simplified mock. In a real scenario, you'd use the FakerDataGenerator.
      if (view === 'payment-type') {
        return {
          nodes: [
            { id: 'Total Payments', label: 'Total Payments' },
            { id: 'VISA', label: 'VISA' },
            { id: 'MASTERCARD', label: 'MASTERCARD' },
          ],
          links: [
            { source: 'Total Payments', target: 'VISA', value: 15000 },
            { source: 'Total Payments', target: 'MASTERCARD', value: 10000 },
          ],
        };
      } else if (view === 'state') {
        return {
          nodes: [
            { id: 'Total Payments', label: 'Total Payments' },
            { id: 'TX', label: 'TX' },
            { id: 'CA', label: 'CA' },
          ],
          links: [
            { source: 'Total Payments', target: 'TX', value: 20000 },
            { source: 'Total Payments', target: 'CA', value: 18000 },
          ],
        };
      } else if (view === 'demographic') {
        return {
          nodes: [
            { id: 'Total Payments', label: 'Total Payments' },
            { id: 'White', label: 'White' },
            { id: 'Hispanic', label: 'Hispanic' },
          ],
          links: [
            { source: 'Total Payments', target: 'White', value: 12000 },
            { source: 'Total Payments', target: 'Hispanic', value: 8000 },
          ],
        };
      }
      return { nodes: [], links: [] };
    };

    setSankeyData(generateMockSankeyData(sankeyView));
  }, [sankeyView]);

  return { sankeyData, sankeyView, setSankeyView };
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export const SankeyDashboard: React.FC = () => {
  const { sankeyData, sankeyView, setSankeyView } = useCompanyAnalytics({ 
    enableRealTime: true, 
    autoStart: true 
  });

  const viewDescriptions: Record<SankeyView, string> = {
    'payment-type': '💳 See how total payments are distributed across payment methods (VISA, Mastercard, Discover, ACH, Money Orders)',
    'state': '📍 Visualize which states generate the most payment volume from your debtors',
    'demographic': '👥 Understand payment patterns across different demographic groups',
  };

  return (
    <div className="p-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-lg">
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-foreground)] mb-2 flex items-center space-x-3">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Payment Flow Analysis
              </span>
            </h2>
            <p className="text-[var(--color-muted-foreground)] text-lg">
              Visualize how payments flow through different dimensions
            </p>
          </div>
          
          <SankeyViewSelector currentView={sankeyView} onViewChange={setSankeyView} />
        </div>
        
        <div className="mt-4 p-3 bg-white/60 rounded-lg border border-indigo-100">
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {viewDescriptions[sankeyView]}
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6 border border-indigo-100" style={{ height: '500px' }}>
        {sankeyData && sankeyData.nodes.length > 0 ? (
          <SankeyChart data={sankeyData} currentView={sankeyView} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No payment data available for this view</p>
              <p className="text-sm text-gray-400 mt-1">Try selecting a different view or check your data</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {sankeyView === 'payment-type' && (
          <>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center space-x-2 mb-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">Primary Method</h4>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {sankeyData?.links.sort((a: SankeyLink, b: SankeyLink) => b.value - a.value)[0]?.target || 'N/A'}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {formatCurrency(sankeyData?.links.sort((a: SankeyLink, b: SankeyLink) => b.value - a.value)[0]?.value || 0)}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">Payment Methods</h4>
              </div>
              <p className="text-2xl font-bold text-purple-600">{(sankeyData?.nodes?.length || 1) - 1}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">Active payment types</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-pink-200">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-pink-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">Total Flow</h4>
              </div>
              <p className="text-2xl font-bold text-pink-600">
                {formatCurrency(sankeyData?.links.reduce((sum: number, link: SankeyLink) => sum + link.value, 0) || 0)}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">All payment methods</p>
            </div>
          </>
        )}
        
        {sankeyView === 'state' && (
          <>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="h-5 w-5 text-indigo-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">Top State</h4>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {sankeyData?.links.sort((a: SankeyLink, b: SankeyLink) => b.value - a.value)[0]?.target || 'N/A'}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {formatCurrency(sankeyData?.links.sort((a: SankeyLink, b: SankeyLink) => b.value - a.value)[0]?.value || 0)}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">States Tracked</h4>
              </div>
              <p className="text-2xl font-bold text-purple-600">{(sankeyData?.nodes?.length || 1) - 1}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">Geographic coverage</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-pink-200">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-pink-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">Total Collected</h4>
              </div>
              <p className="text-2xl font-bold text-pink-600">
                {formatCurrency(sankeyData?.links.reduce((sum: number, link: SankeyLink) => sum + link.value, 0) || 0)}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">From top states</p>
            </div>
          </>
        )}
        
        {sankeyView === 'demographic' && (
          <>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-indigo-200">
              <div className="flex items-center space-x-2 mb-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">Top Group</h4>
              </div>
              <p className="text-2xl font-bold text-indigo-600">
                {sankeyData?.links.sort((a: SankeyLink, b: SankeyLink) => b.value - a.value)[0]?.target || 'N/A'}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {formatCurrency(sankeyData?.links.sort((a: SankeyLink, b: SankeyLink) => b.value - a.value)[0]?.value || 0)}
              </p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-5 w-5 text-purple-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">Demographics</h4>
              </div>
              <p className="text-2xl font-bold text-purple-600">{(sankeyData?.nodes?.length || 1) - 1}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">Groups represented</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-pink-200">
              <div className="flex items-center space-x-2 mb-2">
                <DollarSign className="h-5 w-5 text-pink-600" />
                <h4 className="font-semibold text-[var(--color-foreground)]">Total Payments</h4>
              </div>
              <p className="text-2xl font-bold text-pink-600">
                {formatCurrency(sankeyData?.links.reduce((sum: number, link: SankeyLink) => sum + link.value, 0) || 0)}
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">All demographics</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};