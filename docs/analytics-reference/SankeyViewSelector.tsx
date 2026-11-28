import React from 'react';
import { CreditCard, MapPin, Users } from 'lucide-react';
import { SankeyView } from './sankey.types';


interface SankeyViewSelectorProps {
  currentView: SankeyView;
  onViewChange: (view: SankeyView) => void;
}

export const SankeyViewSelector: React.FC<SankeyViewSelectorProps> = ({
  currentView,
  onViewChange,
}) => {
  return (
    <div className="flex items-center space-x-2 bg-white rounded-lg p-1 shadow-sm border border-indigo-200">
      <button
        onClick={() => onViewChange('payment-type')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${currentView === 'payment-type' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        <CreditCard className="h-4 w-4" />
        <span className="text-sm font-medium">Payment Types</span>
      </button>
      <button
        onClick={() => onViewChange('state')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${currentView === 'state' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        <MapPin className="h-4 w-4" />
        <span className="text-sm font-medium">Top States</span>
      </button>
      <button
        onClick={() => onViewChange('demographic')}
        className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${currentView === 'demographic' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
      >
        <Users className="h-4 w-4" />
        <span className="text-sm font-medium">Demographics</span>
      </button>
    </div>
  );
};