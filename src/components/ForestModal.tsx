import React from 'react';
import { X, Trees } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Tree, Tag } from '../types';

interface ForestModalProps {
  isOpen: boolean;
  onClose: () => void;
  trees: Tree[];
  stats: { study: number; work: number; reading: number };
}

const ForestModal: React.FC<ForestModalProps> = ({ isOpen, onClose, trees, stats }) => {
  if (!isOpen) return null;

  const pieData = [
    { name: 'Study', value: stats.study + 10 }, // Added base value for demo
    { name: 'Work', value: stats.work + 15 },
    { name: 'Reading', value: stats.reading + 5 },
  ];
  const COLORS = ['#000000', '#0071E3', '#F5A623']; // Black, Blue, Orange

  const barData = [
    { day: 'M', hours: 2 },
    { day: 'T', hours: 4.5 },
    { day: 'W', hours: 3 },
    { day: 'T', hours: 5 },
    { day: 'F', hours: 2.5 },
    { day: 'S', hours: 6 },
    { day: 'S', hours: 1 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative bg-[#F5F5F7] dark:bg-[#1C1C1E] w-full max-w-4xl h-[85vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-8 py-6 bg-white dark:bg-[#2C2C2E] flex items-center justify-between border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2">
             <Trees className="w-6 h-6 text-green-600" />
             <h2 className="text-xl font-bold text-black dark:text-white">我的森林</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Forest Grid */}
          <div className="bg-[#EAFBF3] dark:bg-[#1C2C24] rounded-3xl p-8 min-h-[300px] flex flex-col">
             <h3 className="text-gray-600 dark:text-gray-300 font-semibold mb-4">Forest Grid</h3>
             <div className="flex-1 border-2 border-dashed border-green-200 dark:border-green-800 rounded-2xl flex flex-wrap content-start p-4 gap-4 overflow-y-auto max-h-[400px]">
                {trees.length === 0 && (
                   <div className="w-full h-full flex items-center justify-center text-gray-400">
                      还没有树木，开始专注吧！
                   </div>
                )}
                {trees.map(tree => (
                    <div key={tree.id} className="flex flex-col items-center animate-bounce-in transform hover:scale-110 transition-transform cursor-pointer" title={`${tree.duration} mins`}>
                        <span className="text-5xl filter drop-shadow-lg">{tree.type === 'oak' ? '🌳' : '🌲'}</span>
                    </div>
                ))}
             </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             
             {/* Tag Distribution */}
             <div className="bg-white dark:bg-[#2C2C2E] rounded-3xl p-6">
                <h3 className="text-gray-600 dark:text-gray-300 font-semibold mb-4">Tag Distribution</h3>
                <div className="h-48">
                   <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                         <Pie
                           data={pieData}
                           cx="50%"
                           cy="50%"
                           innerRadius={50}
                           outerRadius={70}
                           paddingAngle={5}
                           dataKey="value"
                           stroke="none"
                         >
                           {pieData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <ReTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
                         />
                      </PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 mt-2">
                   {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1 text-xs text-gray-500">
                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                         {entry.name}
                      </div>
                   ))}
                </div>
             </div>

             {/* Weekly Focus Time */}
             <div className="bg-white dark:bg-[#2C2C2E] rounded-3xl p-6">
                <h3 className="text-gray-600 dark:text-gray-300 font-semibold mb-4">Weekly Focus Time</h3>
                <div className="h-48">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                         <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9CA3AF', fontSize: 12}} />
                         <YAxis hide />
                         <Bar dataKey="hours" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                         <ReTooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>
             </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ForestModal;