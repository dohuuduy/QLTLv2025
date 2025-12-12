import React from 'react';
import { TrangThaiTaiLieu } from '../../types';

interface BadgeProps {
  status: TrangThaiTaiLieu | string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  let className = "px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ";
  let text = "";

  switch (status) {
    case TrangThaiTaiLieu.SOAN_THAO:
      className += "bg-gray-100 text-gray-600 border border-gray-200";
      text = "Đang soạn thảo";
      break;
    case TrangThaiTaiLieu.CHO_DUYET:
      className += "bg-blue-100 text-blue-600 border border-blue-200";
      text = "Chờ duyệt";
      break;
    case TrangThaiTaiLieu.DA_BAN_HANH:
      className += "bg-green-100 text-green-600 border border-green-200";
      text = "Đã ban hành";
      break;
    case TrangThaiTaiLieu.HET_HIEU_LUC:
      className += "bg-red-100 text-red-600 border border-red-200";
      text = "Hết hiệu lực";
      break;
    default:
      className += "bg-gray-100 text-gray-600";
      text = status;
  }

  return (
    <span className={className}>
      {text}
    </span>
  );
};