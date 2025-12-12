import React from 'react';
import { LichSuHoatDong, TrangThaiTaiLieu } from '../types';
import { format } from 'date-fns';
import { FilePlus, Send, CheckCircle, XCircle, FileCheck, AlertCircle, Clock } from 'lucide-react';

interface DocumentTimelineProps {
  history: LichSuHoatDong[];
}

export const DocumentTimeline: React.FC<DocumentTimelineProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return <div className="text-gray-400 italic text-sm text-center py-4">Chưa có lịch sử hoạt động nào.</div>;
  }

  // Sắp xếp mới nhất lên đầu
  const sortedHistory = [...history].sort((a, b) => new Date(b.thoi_gian).getTime() - new Date(a.thoi_gian).getTime());

  const getActionConfig = (action: string) => {
    switch (action) {
      case 'TAO_MOI':
        return { icon: FilePlus, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Tạo mới' };
      case 'CAP_NHAT':
        return { icon: FilePlus, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/30', label: 'Cập nhật' };
      case 'GUI_DUYET':
        return { icon: Send, color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Gửi duyệt' };
      case 'PHE_DUYET':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Phê duyệt' };
      case 'BAN_HANH':
        return { icon: FileCheck, color: 'text-teal-600', bg: 'bg-teal-100 dark:bg-teal-900/30', label: 'Ban hành' };
      case 'TU_CHOI':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Từ chối' };
      default:
        return { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', label: action };
    }
  };

  return (
    <div className="relative pl-4 border-l border-gray-200 dark:border-slate-700 space-y-8 my-4">
      {sortedHistory.map((item) => {
        const config = getActionConfig(item.hanh_dong);
        const Icon = config.icon;

        return (
          <div key={item.id} className="relative group">
            {/* Dot */}
            <div className={`absolute -left-[25px] top-0 w-5 h-5 rounded-full border-2 border-white dark:border-slate-900 ${config.bg} ${config.color} flex items-center justify-center`}>
               <Icon size={12} />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${config.color}`}>{config.label}</span>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={10} /> {format(new Date(item.thoi_gian), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
              
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
                Bởi: {item.nguoi_thuc_hien}
              </div>

              {item.ghi_chu && (
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800 p-2 rounded border border-gray-100 dark:border-slate-700 italic">
                  "{item.ghi_chu}"
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};