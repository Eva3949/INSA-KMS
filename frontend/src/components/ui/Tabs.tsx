import React from 'react';

interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange }) => {
  return (
    <div className="border-b border-kms-slate-200 overflow-x-auto">
      <nav className="flex space-x-4 sm:space-x-6 min-w-max pb-0.5" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`py-2 px-1 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors shrink-0 whitespace-nowrap ${
                isActive
                  ? 'border-blue-700 text-blue-800'
                  : 'border-transparent text-kms-slate-600 hover:text-kms-slate-900 hover:border-kms-slate-300'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-blue-100 text-blue-800' : 'bg-kms-slate-100 text-kms-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
