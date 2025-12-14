
import React from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState } from '../types';
import { Check, Edit3, Search, FileSignature, Send } from 'lucide-react';

interface WorkflowStepperProps {
  document: TaiLieu;
  masterData: MasterDataState;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ document, masterData }) => {
  const getName = (id: string) => masterData.nhanSu.find(u => u.id === id)?.ho_ten || id || 'Chưa chỉ định';

  const steps = [
    { 
      id: 1, 
      label: 'Soạn thảo', 
      user: getName(document.nguoi_soan_thao), 
      icon: Edit3,
      status: 'completed' // Bước 1 luôn coi như completed nếu đã có tài liệu
    },
    { 
      id: 2, 
      label: 'Xem xét', 
      user: getName(document.nguoi_xem_xet), 
      icon: Search,
      status: 'pending' 
    },
    { 
      id: 3, 
      label: 'Phê duyệt', 
      user: getName(document.nguoi_phe_duyet), 
      icon: FileSignature,
      status: 'pending'
    },
    { 
      id: 4, 
      label: 'Ban hành', 
      user: 'Hệ thống', 
      icon: Send,
      status: 'pending'
    }
  ];

  // Logic xác định trạng thái từng bước
  const currentStatus = document.trang_thai;
  
  if (currentStatus === TrangThaiTaiLieu.SOAN_THAO) {
    steps[1].status = 'pending';
    steps[2].status = 'waiting';
    steps[3].status = 'waiting';
  } else if (currentStatus === TrangThaiTaiLieu.CHO_DUYET) {
    steps[0].status = 'completed';
    // Giả định đơn giản: Chờ duyệt nghĩa là đang ở bước Xem xét hoặc Phê duyệt
    // Trong thực tế cần logic phức tạp hơn
    steps[1].status = 'current'; // Đang xử lý (Pulse)
    steps[2].status = 'waiting';
    steps[3].status = 'waiting';
  } else if (currentStatus === TrangThaiTaiLieu.DA_BAN_HANH) {
    steps.forEach(s => s.status = 'completed');
  } else if (currentStatus === TrangThaiTaiLieu.HET_HIEU_LUC) {
     steps.forEach(s => s.status = 'rejected');
  }

  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between relative">
        {/* Connecting Line Background */}
        <div className="absolute left-0 top-5 w-full h-1 bg-gray-200 dark:bg-slate-700 -z-10 rounded"></div>

        {/* Dynamic Steps */}
        {steps.map((step, index) => {
          let circleClass = "bg-gray-100 border-gray-300 text-gray-400";
          let labelClass = "text-gray-400";
          let lineClass = "bg-gray-200 dark:bg-slate-700";

          if (step.status === 'completed') {
            circleClass = "bg-green-600 border-green-600 text-white";
            labelClass = "text-green-700 dark:text-green-400 font-bold";
            lineClass = "bg-green-600";
          } else if (step.status === 'current') {
            circleClass = "bg-blue-600 border-blue-600 text-white animate-pulse ring-4 ring-blue-100 dark:ring-blue-900";
            labelClass = "text-blue-700 dark:text-blue-400 font-bold";
          } else if (step.status === 'rejected') {
            circleClass = "bg-gray-300 border-gray-300 text-gray-500";
             labelClass = "text-gray-500 line-through";
          }

          // Line coloring logic (only color line IF previous step is completed)
          const isLineActive = index > 0 && steps[index-1].status === 'completed';

          return (
            <div key={step.id} className="flex flex-col items-center relative flex-1 first:flex-none last:flex-none">
              
              {/* Colored Line Segment (Left of circle) */}
              {index > 0 && (
                <div 
                   className={`absolute top-5 right-[50%] w-full h-1 -z-10 transition-colors duration-500 ${isLineActive ? 'bg-green-600' : 'bg-gray-200 dark:bg-slate-700'}`}
                   style={{ width: 'calc(100% - 20px)' }} // Adjust based on spacing
                ></div>
              )}

              {/* Circle */}
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300 ${circleClass} bg-white dark:bg-slate-800`}>
                {step.status === 'completed' ? <Check size={18} /> : <step.icon size={18} />}
              </div>

              {/* Label & User */}
              <div className="mt-3 text-center">
                <p className={`text-xs uppercase tracking-wider mb-1 ${labelClass}`}>{step.label}</p>
                <div className="flex items-center justify-center gap-1 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-gray-100 dark:border-slate-700 shadow-sm max-w-[100px] sm:max-w-none">
                   {step.user !== 'Hệ thống' && (
                     <div className="w-4 h-4 rounded-full bg-gray-200 text-[8px] flex items-center justify-center font-bold text-gray-600">
                        {step.user?.charAt(0)}
                     </div>
                   )}
                   <span className="text-[10px] text-gray-600 dark:text-gray-300 truncate">{step.user}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
