
import React, { useEffect, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrangThaiTaiLieu, TaiLieu } from '../../types';
import { ArrowRight, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { fetchDocumentsFromDB } from '../../services/supabaseService';

interface DashboardProps {
  onNavigateToDocuments: (filters: { trang_thai?: string; bo_phan?: string }) => void;
}

// Define props interface with optional children to avoid TS errors
interface ChartContainerProps {
  children?: React.ReactNode;
  height?: number | string;
}

// Component Wrapper để đảm bảo chỉ render Chart khi container có kích thước
const ChartContainer = ({ children, height = 300 }: ChartContainerProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        // Kiểm tra kích thước ngay lập tức
        if (containerRef.current) {
            const { offsetWidth, offsetHeight } = containerRef.current;
            if (offsetWidth > 0 && offsetHeight > 0) {
                setShouldRender(true);
                return;
            }
        }
        
        // Fallback: Sử dụng ResizeObserver
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
                    setShouldRender(true);
                    // Không disconnect ngay để handle resize window
                }
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        // Fallback cuối cùng: Timer an toàn
        const timer = setTimeout(() => setShouldRender(true), 1000);

        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, []);

    return (
        <div ref={containerRef} style={{ width: '100%', height: height }} className="relative">
            {shouldRender ? children : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Đang tải biểu đồ...</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigateToDocuments }) => {
  const [data, setData] = useState<TaiLieu[]>([]);

  useEffect(() => {
      const loadData = async () => {
          const docs = await fetchDocumentsFromDB();
          if (docs) setData(docs);
      };
      loadData();
  }, []);

  // 1. Dữ liệu Trạng thái (Status Pie)
  const statusCounts = data.reduce((acc, curr) => {
    acc[curr.trang_thai] = (acc[curr.trang_thai] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(statusCounts).map(key => ({
    name: key,
    displayName: getStatusLabel(key),
    value: statusCounts[key],
    fill: getStatusColor(key)
  }));

  // 2. Dữ liệu Bộ phận (Department Bar)
  const departmentCounts = data.reduce((acc, curr) => {
    const dept = curr.bo_phan_soan_thao || 'Khác';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barData = Object.keys(departmentCounts).map(key => ({
    name: key,
    documents: departmentCounts[key],
  }));

  // 3. Dữ liệu Năng suất (Top Authors Bar)
  const authorCounts = data.reduce((acc, curr) => {
    const author = curr.nguoi_soan_thao || 'Unknown';
    acc[author] = (acc[author] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topAuthors = Object.keys(authorCounts)
    .map(key => ({ name: key, documents: authorCounts[key] }))
    .sort((a, b) => b.documents - a.documents)
    .slice(0, 5); 

  const cardClass = "bg-white dark:bg-slate-900 p-6 rounded-lg shadow border border-gray-100 dark:border-slate-800 transition-colors hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer group";
  const titleClass = "text-gray-500 dark:text-gray-400 text-sm font-medium";

  // Helpers
  function getStatusLabel(key: string) {
      if(key === TrangThaiTaiLieu.SOAN_THAO) return "Đang soạn thảo";
      if(key === TrangThaiTaiLieu.CHO_DUYET) return "Chờ duyệt";
      if(key === TrangThaiTaiLieu.DA_BAN_HANH) return "Đã ban hành";
      if(key === TrangThaiTaiLieu.HET_HIEU_LUC) return "Hết hiệu lực";
      return key;
  }
  function getStatusColor(key: string) {
      if(key === TrangThaiTaiLieu.SOAN_THAO) return "#94a3b8"; // Gray
      if(key === TrangThaiTaiLieu.CHO_DUYET) return "#f97316"; // Orange
      if(key === TrangThaiTaiLieu.DA_BAN_HANH) return "#22c55e"; // Green
      if(key === TrangThaiTaiLieu.HET_HIEU_LUC) return "#ef4444"; // Red
      return "#8884d8";
  }

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* 4 Cards Thống Kê Nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={cardClass} onClick={() => onNavigateToDocuments({})}>
          <h3 className={titleClass}>Tổng tài liệu</h3>
          <div className="flex items-center justify-between">
             <p className="text-3xl font-bold text-primary dark:text-blue-400 mt-2">{data.length}</p>
             <ArrowRight className="text-gray-300 group-hover:text-blue-500 transition-colors" size={20}/>
          </div>
        </div>
        <div className={cardClass} onClick={() => onNavigateToDocuments({ trang_thai: TrangThaiTaiLieu.CHO_DUYET })}>
          <h3 className={titleClass}>Chờ duyệt</h3>
          <div className="flex items-center justify-between">
             <p className="text-3xl font-bold text-orange-500 mt-2">
               {data.filter(t => t.trang_thai === TrangThaiTaiLieu.CHO_DUYET).length}
             </p>
             <ArrowRight className="text-gray-300 group-hover:text-orange-500 transition-colors" size={20}/>
          </div>
        </div>
        <div className={cardClass} onClick={() => onNavigateToDocuments({ trang_thai: TrangThaiTaiLieu.DA_BAN_HANH })}>
          <h3 className={titleClass}>Đã ban hành</h3>
          <div className="flex items-center justify-between">
             <p className="text-3xl font-bold text-green-500 mt-2">
               {data.filter(t => t.trang_thai === TrangThaiTaiLieu.DA_BAN_HANH).length}
             </p>
             <ArrowRight className="text-gray-300 group-hover:text-green-500 transition-colors" size={20}/>
          </div>
        </div>
        <div className={cardClass} onClick={() => onNavigateToDocuments({ trang_thai: TrangThaiTaiLieu.HET_HIEU_LUC })}>
          <h3 className={titleClass}>Hết hiệu lực</h3>
          <div className="flex items-center justify-between">
             <p className="text-3xl font-bold text-red-500 mt-2">
               {data.filter(t => t.trang_thai === TrangThaiTaiLieu.HET_HIEU_LUC).length}
             </p>
             <ArrowRight className="text-gray-300 group-hover:text-red-500 transition-colors" size={20}/>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Pie Chart Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow border border-gray-100 dark:border-slate-800 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <PieChartIcon size={20} className="text-purple-500"/> Trạng thái tài liệu
          </h3>
          <div className="flex-1 w-full min-h-0 min-w-0">
             <ChartContainer height="100%">
                {/* Thêm minWidth và minHeight để tránh lỗi width(-1) */}
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                      outerRadius="80%"
                      dataKey="value"
                      onClick={(entry) => onNavigateToDocuments({ trang_thai: entry.name })}
                      className="cursor-pointer outline-none focus:outline-none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                      itemStyle={{ color: '#f8fafc' }}
                      formatter={(value, name, props) => [value, props.payload.displayName]} 
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      formatter={(value, entry: any) => <span className="text-gray-600 dark:text-gray-400 ml-1">{entry.payload.displayName}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
             </ChartContainer>
          </div>
        </div>

        {/* Bar Chart Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow border border-gray-100 dark:border-slate-800 flex flex-col h-[400px]">
          <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <BarChart3 size={20} className="text-blue-500"/> Tài liệu theo bộ phận
          </h3>
          <div className="flex-1 w-full min-h-0 min-w-0">
            <ChartContainer height="100%">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart 
                    data={barData} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                    onClick={(data) => {
                        if (data && data.activePayload && data.activePayload.length > 0) {
                            const deptName = data.activePayload[0].payload.name;
                            onNavigateToDocuments({ bo_phan: deptName });
                        }
                    }}
                    className="cursor-pointer"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.3} />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100} 
                      tick={{fontSize: 11, fill: '#94a3b8'}} 
                      stroke="#94a3b8" 
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                      cursor={{fill: 'rgba(59, 130, 246, 0.1)'}}
                    />
                    <Bar 
                        dataKey="documents" 
                        name="Số lượng" 
                        fill="#3b82f6" 
                        radius={[0, 4, 4, 0]} 
                        barSize={24} 
                        className="hover:fill-blue-400 transition-colors"
                    />
                  </BarChart>
                </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Top Authors */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-lg shadow border border-gray-100 dark:border-slate-800 flex flex-col h-[400px] lg:col-span-2">
          <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100 flex items-center gap-2">
             <TrendingUp size={20} className="text-green-500" /> Năng suất nhân sự (Top 5)
          </h3>
          <div className="flex-1 w-full min-h-0 min-w-0">
             <ChartContainer height="100%">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                  <BarChart 
                    data={topAuthors} 
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                     <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}} />
                     <YAxis stroke="#94a3b8" allowDecimals={false} />
                     <Tooltip 
                       contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                       cursor={{fill: 'rgba(34, 197, 94, 0.1)'}}
                     />
                     <Legend />
                     <Bar 
                        dataKey="documents" 
                        name="Số lượng tài liệu soạn thảo" 
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                        barSize={40}
                     />
                  </BarChart>
                </ResponsiveContainer>
             </ChartContainer>
          </div>
        </div>

      </div>
    </div>
  );
};
