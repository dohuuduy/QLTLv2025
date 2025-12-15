
import React from 'react';

export enum TrangThaiTaiLieu {
  SOAN_THAO = 'soan_thao',
  CHO_DUYET = 'cho_duyet',
  DA_BAN_HANH = 'da_ban_hanh',
  HET_HIEU_LUC = 'het_hieu_luc',
  DA_XOA = 'da_xoa'
}

export enum TrangThaiHoSo {
  LUU_TRU = 'luu_tru',        // Đang lưu trữ bình thường
  SAP_HET_HAN = 'sap_het_han', // Sắp đến hạn hủy (< 30 ngày)
  CHO_HUY = 'cho_huy',        // Đã hết hạn, chờ duyệt hủy
  DA_HUY = 'da_huy'           // Đã tiêu hủy
}

export interface DinhKem {
  id: string;
  ten_file: string;
  url: string;
  loai: 'pdf' | 'doc' | 'excel' | 'image' | 'link' | 'other';
  ngay_upload: string;
}

export interface LichSuHoatDong {
  id: string;
  nguoi_thuc_hien: string; // ID người thực hiện (hoặc tên snapshot)
  hanh_dong: 'TAO_MOI' | 'CAP_NHAT' | 'GUI_DUYET' | 'PHE_DUYET' | 'TU_CHOI' | 'BAN_HANH' | 'HUY_BO';
  thoi_gian: string;
  ghi_chu?: string;
  trang_thai_cu?: TrangThaiTaiLieu;
  trang_thai_moi?: TrangThaiTaiLieu;
}

export interface TaiLieu {
  id: string;
  // Định danh
  ma_tai_lieu: string;
  ten_tai_lieu: string;
  
  // REFERENCES (Lưu ID thay vì Text)
  id_loai_tai_lieu: string; // Link MasterData.loaiTaiLieu
  id_linh_vuc?: string;     // Link MasterData.linhVuc (NEW)
  id_tieu_chuan?: string[]; // Link MasterData.tieuChuan (Array of IDs)
  
  // HIERARCHY (QUAN HỆ CHA CON)
  tai_lieu_cha_id?: string; // ID của tài liệu cha

  // Sắp xếp
  thu_tu?: number; // NEW: Thứ tự hiển thị ưu tiên

  // Phiên bản & Thời gian
  phien_ban: string; // VD: 1.0, 1.1 (Version)
  lan_ban_hanh: number; // VD: 01, 02 (Edition)
  ngay_ban_hanh: string; // Ngày ký ban hành
  ngay_hieu_luc: string; // Ngày bắt đầu áp dụng
  
  // Kiểm soát định kỳ (NEW)
  chu_ky_ra_soat?: number; // Số tháng định kỳ rà soát (VD: 12, 24)
  ngay_ra_soat_tiep_theo?: string; // Ngày hệ thống tự tính hoặc user chọn
  
  // Nội dung & File
  mo_ta_tom_tat: string;
  dinh_kem?: DinhKem[]; // NEW: Danh sách file đính kèm
  lich_su?: LichSuHoatDong[]; // NEW: Lịch sử hoạt động

  // Trách nhiệm (Lưu ID NhanSu - Đã đổi tên theo yêu cầu)
  id_nguoi_soan_thao: string;
  id_nguoi_xem_xet: string;
  id_nguoi_phe_duyet: string;
  
  // Standard columns (System)
  ngay_tao: string;
  id_nguoi_tao: string; // Renaming consistent with others
  ngay_cap_nhat_cuoi: string;
  id_nguoi_cap_nhat_cuoi: string; // Renaming
  trang_thai: TrangThaiTaiLieu;
}

export interface HoSo {
  id: string;
  ma_ho_so: string;       // Mã định danh hồ sơ
  tieu_de: string;        // Tên hồ sơ (VD: Biên bản họp ISO tháng 10)
  ma_tai_lieu_lien_quan?: string; // Link đến Tài liệu quy trình (VD: theo QT-NS-01)
  
  id_phong_ban: string;      // Bộ phận sở hữu (ID)
  id_nguoi_tao: string;      // Người tạo (ID)
  ngay_tao: string;       // Ngày ghi nhận hồ sơ

  vi_tri_luu_tru: string; // Kho, Tủ số 1, Link Drive...
  dang_luu_tru: 'BAN_MEM' | 'BAN_CUNG' | 'CA_HAI';
  
  thoi_gian_luu_tru: number; // Số tháng lưu trữ (VD: 12, 60, 0 = vĩnh viễn)
  ngay_het_han: string;   // Ngày dự kiến hủy
  
  trang_thai: TrangThaiHoSo;
  dinh_kem?: DinhKem[];
}

export interface NhanSu {
  id: string;
  ho_ten: string;
  chuc_vu: string;
  phong_ban: string;
  email: string;
  avatar?: string;
  roles: UserRole[]; // Danh sách quyền hạn
  thu_tu?: number; // NEW
}

export type UserRole = 'SOAN_THAO' | 'XEM_XET' | 'PHE_DUYET' | 'QUAN_TRI';

export interface DanhMucItem {
  id: string;
  ten: string;
  mo_ta?: string;
  active: boolean;
  thu_tu?: number; // NEW
  parentId?: string; // NEW: Link đến danh mục cha (VD: Auditor thuộc Tổ chức nào)
  
  // --- CONFIG AUTO-NUMBERING (NEW) ---
  ma_viet_tat?: string; // VD: QT, BM, HD
  ky_tu_noi?: string;   // VD: ., -, /
  do_dai_so?: number;   // VD: 2 (01, 02), 3 (001, 002)
}

// --- AUDIT MODULE TYPES ---

export type TrangThaiKeHoach = 'lap_ke_hoach' | 'da_chot' | 'dang_thuc_hien' | 'hoan_thanh';

export interface PhienDanhGia {
  id: string;
  tieu_de: string; // VD: Đánh giá Phòng HCNS - Buổi sáng
  
  thoi_gian_bat_dau: string; // ISO Datetime
  thoi_gian_ket_thuc: string; // ISO Datetime
  
  phong_ban_duoc_danh_gia: string; // Link với MasterData.boPhan
  dai_dien_phong_ban?: string; // Người tiếp đoàn
  
  truong_doan_danh_gia: string; // Link với MasterData.auditors (Tên Auditor)
  thanh_vien_doan?: string[]; // List tên Auditor
  
  // Quan trọng: Phạm vi tài liệu cần chuẩn bị
  tai_lieu_lien_quan_ids: string[]; // List ID của TaiLieu (QT-NS-01...)
  
  ghi_chu?: string;
  trang_thai: 'chua_bat_dau' | 'hoan_thanh' | 'huy';
}

export interface KeHoachDanhGia {
  id: string;
  ten_ke_hoach: string; // VD: Đánh giá nội bộ lần 1 năm 2024
  loai_danh_gia: string; // Link với MasterData.loaiDanhGia (Nội bộ, Bên ngoài...)
  
  // NEW FIELDS
  to_chuc_danh_gia_id?: string; // Link MasterData.toChucDanhGia
  truong_doan_id?: string;      // Link MasterData.auditors
  
  thoi_gian_du_kien_start: string;
  thoi_gian_du_kien_end: string;
  
  muc_tieu: string;
  pham_vi: string;
  
  danh_sach_phien: PhienDanhGia[];
  
  id_nguoi_tao: string; // Changed from nguoi_tao
  ngay_tao: string;
  trang_thai: TrangThaiKeHoach;
}

// --------------------------------

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
  linkTo?: string; // e.g., 'approvals'
}

// --- NEW TYPES FOR SETTINGS & LOGS ---

export interface SystemLog {
  id: string;
  thoi_gian: string;
  nguoi_dung: string;
  hanh_dong: string; // VD: "Xóa tài liệu", "Khôi phục dữ liệu"
  chi_tiet: string;
  ip: string;
}

export interface BackupData {
  version: string;
  timestamp: string;
  masterData: MasterDataState;
  documents: TaiLieu[];
  records: HoSo[];
  auditPlans: KeHoachDanhGia[];
}

// Master Data State Structure
export interface MasterDataState {
  loaiTaiLieu: DanhMucItem[];
  linhVuc: DanhMucItem[]; // Restored
  boPhan: DanhMucItem[];
  chucVu: DanhMucItem[];
  tieuChuan: DanhMucItem[];
  nhanSu: NhanSu[];
  // NEW CATEGORIES FOR AUDIT
  toChucDanhGia: DanhMucItem[];
  auditors: DanhMucItem[];
  loaiDanhGia: DanhMucItem[];
}

export type SortDirection = 'asc' | 'desc';

export interface ColumnDefinition<T> {
  key: keyof T;
  header: string;
  visible: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}
