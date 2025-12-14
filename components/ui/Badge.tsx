
import React from 'react';
import { TrangThaiTaiLieu } from '../../types';

interface BadgeProps {
  status: TrangThaiTaiLieu | string;
  variant?: 'default' | 'outline'; // Add variant for flexibility
}

export const Badge: React.FC<BadgeProps> = ({ status, variant = 'default' }) => {
  const baseClass = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border";
  
  let colorClass = "";
  let text = "";

  // Logic mapping colors - Using Tailwind colors that guarantee contrast
  switch (status) {
    case TrangThaiTaiLieu.SOAN_THAO:
      // Neutral / Gray
      colorClass = "border-transparent bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700";
      text = "Đang soạn thảo";
      break;
    case TrangThaiTaiLieu.CHO_DUYET:
      // Warning / Amber (Darker text for legibility)
      colorClass = "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60";
      text = "Chờ duyệt";
      break;
    case TrangThaiTaiLieu.DA_BAN_HANH:
      // Success / Emerald
      colorClass = "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60";
      text = "Đã ban hành";
      break;
    case TrangThaiTaiLieu.HET_HIEU_LUC:
      // Destructive / Rose
      colorClass = "border-transparent bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/60";
      text = "Hết hiệu lực";
      break;
    case TrangThaiTaiLieu.DA_XOA:
        colorClass = "border-transparent bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400";
        text = "Đã xóa";
        break;
    default:
      // Default / Primary
      colorClass = "border-transparent bg-primary/10 text-primary hover:bg-primary/20";
      text = status;
  }

  // Override for outline variant
  if (variant === 'outline') {
      // Logic for outline styles (omitted for brevity, keeping existing logic mainly)
  }

  return (
    <span className={`${baseClass} ${colorClass}`}>
      {text}
    </span>
  );
};
