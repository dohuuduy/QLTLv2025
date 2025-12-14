
import { TaiLieu, TrangThaiTaiLieu, NhanSu, MasterDataState, AppNotification, HoSo, TrangThaiHoSo, KeHoachDanhGia, SystemLog } from './types';
import { FileText, Home, Users, Settings, FileCheck, Database, Archive, CalendarDays } from 'lucide-react';

export const APP_NAME = "ISO DocManager";

export const MENU_ITEMS = [
  { label: 'Tổng quan', icon: Home, path: 'dashboard' },
  { label: 'Tài liệu', icon: FileText, path: 'documents' }, 
  { label: 'Hồ sơ', icon: Archive, path: 'records' }, 
  { label: 'Lịch Audit', icon: CalendarDays, path: 'audit-schedule' }, 
  { label: 'Phê duyệt', icon: FileCheck, path: 'approvals' },
  { label: 'Danh mục', icon: Database, path: 'master-data' }, 
  { label: 'Cấu hình', icon: Settings, path: 'settings' },
];

// --- INITIAL MASTER DATA ---

export const INITIAL_MASTER_DATA: MasterDataState = {
  loaiTaiLieu: [
    { id: '1', ten: "Quy trình (Process)", active: true, thu_tu: 1, ma_viet_tat: 'QT', ky_tu_noi: '.', do_dai_so: 2 },
    { id: '2', ten: "Hướng dẫn công việc (Work Instruction)", active: true, thu_tu: 2, ma_viet_tat: 'HD', ky_tu_noi: '.', do_dai_so: 2 },
    { id: '3', ten: "Biểu mẫu (Form)", active: true, thu_tu: 3, ma_viet_tat: 'BM', ky_tu_noi: '.', do_dai_so: 2 },
    { id: '4', ten: "Quy định (Regulation)", active: true, thu_tu: 4, ma_viet_tat: 'QD', ky_tu_noi: '.', do_dai_so: 2 },
    { id: '5', ten: "Chính sách (Policy)", active: true, thu_tu: 5, ma_viet_tat: 'CS', ky_tu_noi: '.', do_dai_so: 2 },
    { id: '6', ten: "Kế hoạch (Plan)", active: true, thu_tu: 6, ma_viet_tat: 'KH', ky_tu_noi: '-', do_dai_so: 2 },
  ],
  linhVuc: [
    { id: '1', ten: "Hành chính - Nhân sự", active: true, thu_tu: 1 },
    { id: '2', ten: "Tài chính - Kế toán", active: true, thu_tu: 2 },
    { id: '3', ten: "Kinh doanh - Marketing", active: true, thu_tu: 3 },
    { id: '4', ten: "Sản xuất - Vận hành", active: true, thu_tu: 4 },
    { id: '5', ten: "An toàn - Môi trường (HSE)", active: true, thu_tu: 5 },
  ],
  boPhan: [
    { id: '1', ten: "Ban Giám Đốc", active: true, thu_tu: 1 },
    { id: '2', ten: "Phòng HCNS", active: true, thu_tu: 2 },
    { id: '3', ten: "Phòng Kế Toán", active: true, thu_tu: 3 },
    { id: '4', ten: "Phòng Kinh Doanh", active: true, thu_tu: 4 },
    { id: '5', ten: "Xưởng Sản Xuất", active: true, thu_tu: 5 },
  ],
  chucVu: [
    { id: '1', ten: "Giám đốc", active: true, thu_tu: 1 },
    { id: '2', ten: "Phó giám đốc", active: true, thu_tu: 2 },
    { id: '3', ten: "Trưởng phòng", active: true, thu_tu: 3 },
    { id: '4', ten: "Phó phòng", active: true, thu_tu: 4 },
    { id: '5', ten: "Trưởng nhóm", active: true, thu_tu: 5 },
    { id: '6', ten: "Chuyên viên", active: true, thu_tu: 6 },
    { id: '7', ten: "Nhân viên", active: true, thu_tu: 7 },
  ],
  tieuChuan: [
    { id: '1', ten: "ISO 9001:2015", active: true, thu_tu: 1 },
    { id: '2', ten: "ISO 14001:2015", active: true, thu_tu: 2 },
    { id: '3', ten: "ISO 45001:2018", active: true, thu_tu: 3 },
    { id: '4', ten: "ISO 27001", active: true, thu_tu: 4 },
  ],
  nhanSu: [
    { 
      id: 'NS001', 
      ho_ten: "Nguyễn Văn A", 
      chuc_vu: "Trưởng phòng HCNS", 
      phong_ban: "Phòng HCNS", 
      email: "a.nguyen@company.com", 
      roles: ['SOAN_THAO', 'XEM_XET'],
      thu_tu: 1
    },
    { 
      id: 'NS002', 
      ho_ten: "Trần Thị B", 
      chuc_vu: "Giám đốc", 
      phong_ban: "Ban Giám Đốc", 
      email: "b.tran@company.com", 
      roles: ['PHE_DUYET', 'QUAN_TRI'],
      thu_tu: 2
    },
     { 
      id: 'NS003', 
      ho_ten: "Lê Văn C", 
      chuc_vu: "Nhân viên ISO", 
      phong_ban: "Phòng HCNS", 
      email: "c.le@company.com", 
      roles: ['SOAN_THAO'],
      thu_tu: 3
    }
  ],
  // --- NEW AUDIT CATEGORIES ---
  toChucDanhGia: [
    { id: '1', ten: "SGS Vietnam", active: true, thu_tu: 1 },
    { id: '2', ten: "BSI Vietnam", active: true, thu_tu: 2 },
    { id: '3', ten: "TUV Nord", active: true, thu_tu: 3 },
    { id: '4', ten: "Quatest 3", active: true, thu_tu: 4 },
    { id: '5', ten: "Ban ISO Nội bộ", active: true, thu_tu: 5 },
  ],
  auditors: [
    { id: '1', ten: "Nguyễn Văn Kiểm (Lead)", active: true, thu_tu: 1, parentId: '5' }, // Thuộc Ban ISO
    { id: '2', ten: "Trần Thị Soát (Member)", active: true, thu_tu: 2, parentId: '5' }, // Thuộc Ban ISO
    { id: '3', ten: "John Doe (Lead Auditor)", active: true, thu_tu: 3, parentId: '1' }, // Thuộc SGS
    { id: '4', ten: "Jane Smith", active: true, thu_tu: 4, parentId: '2' }, // Thuộc BSI
  ],
  loaiDanhGia: [
    { id: '1', ten: "Đánh giá nội bộ (Internal Audit)", active: true, thu_tu: 1 },
    { id: '2', ten: "Đánh giá bên thứ 2 (Second Party)", active: true, thu_tu: 2 },
    { id: '3', ten: "Đánh giá chứng nhận (Certification)", active: true, thu_tu: 3 },
    { id: '4', ten: "Đánh giá giám sát (Surveillance)", active: true, thu_tu: 4 },
  ]
};

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'N1', title: 'Yêu cầu phê duyệt', message: 'Nguyễn Văn A đã gửi duyệt tài liệu QT-NS-01.', time: '10 phút trước', read: false, type: 'warning', linkTo: 'approvals' },
  { id: 'N2', title: 'Tài liệu được ban hành', message: 'Tài liệu HD-AT-05 đã được ban hành chính thức.', time: '2 giờ trước', read: false, type: 'success', linkTo: 'documents' },
  { id: 'N3', title: 'Nhắc nhở', message: 'Đến hạn rà soát quy trình ISO 9001 định kỳ.', time: '1 ngày trước', read: true, type: 'info', linkTo: 'dashboard' },
  { id: 'N4', title: 'Lịch Đánh giá', message: 'Bạn có lịch đánh giá nội bộ tại Phòng HCNS vào ngày 25/10.', time: 'Vừa xong', read: false, type: 'info', linkTo: 'audit-schedule' },
];

// --- MOCK LOGS (NEW) ---
export const MOCK_SYSTEM_LOGS: SystemLog[] = [
  { id: 'L1', thoi_gian: '2024-10-20T08:30:00', nguoi_dung: 'Trần Thị B', hanh_dong: 'Đăng nhập', chi_tiet: 'Đăng nhập thành công', ip: '192.168.1.10' },
  { id: 'L2', thoi_gian: '2024-10-20T09:15:00', nguoi_dung: 'Trần Thị B', hanh_dong: 'Cấu hình hệ thống', chi_tiet: 'Thay đổi chu kỳ rà soát mặc định', ip: '192.168.1.10' },
  { id: 'L3', thoi_gian: '2024-10-21T10:00:00', nguoi_dung: 'Nguyễn Văn A', hanh_dong: 'Xóa tài liệu', chi_tiet: 'Xóa tài liệu nháp TL-TEST-01', ip: '192.168.1.15' },
  { id: 'L4', thoi_gian: '2024-10-22T14:20:00', nguoi_dung: 'Admin', hanh_dong: 'Khôi phục dữ liệu', chi_tiet: 'Import file backup_20241020.json', ip: '192.168.1.5' },
];

// --- MOCK DOCUMENTS ---

export const MOCK_TAI_LIEU: TaiLieu[] = [
  {
    id: 'TL001',
    ma_tai_lieu: 'QT-NS-01',
    ten_tai_lieu: 'Quy trình tuyển dụng nhân sự',
    loai_tai_lieu: 'Quy trình (Process)',
    linh_vuc: 'Hành chính - Nhân sự',
    tieu_chuan: ['ISO 9001:2015'],
    thu_tu: 10,
    phien_ban: '3.0',
    lan_ban_hanh: 3,
    ngay_ban_hanh: '2023-10-10',
    ngay_hieu_luc: '2023-10-15',
    chu_ky_ra_soat: 12, // 12 tháng
    ngay_ra_soat_tiep_theo: '2024-10-15',
    mo_ta_tom_tat: 'Quy định các bước từ lập kế hoạch, đăng tuyển, phỏng vấn đến tiếp nhận nhân sự mới.',
    dinh_kem: [
      { id: 'DK1', ten_file: 'Quy_trinh_tuyen_dung_v3.pdf', url: '#', loai: 'pdf', ngay_upload: '2023-10-10' }
    ],
    id_nguoi_soan_thao: 'NS001',
    id_nguoi_xem_xet: 'NS001',
    id_nguoi_phe_duyet: 'NS002',
    ngay_tao: '2023-09-01T08:00:00Z',
    id_nguoi_tao: 'NS001',
    ngay_cap_nhat_cuoi: '2023-10-01T10:00:00Z',
    id_nguoi_cap_nhat_cuoi: 'NS002',
    trang_thai: TrangThaiTaiLieu.DA_BAN_HANH,
    lich_su: [
        { id: 'H1', nguoi_thuc_hien: 'Nguyễn Văn A', hanh_dong: 'TAO_MOI', thoi_gian: '2023-09-01T08:00:00Z', ghi_chu: 'Khởi tạo tài liệu phiên bản 3.0' },
        { id: 'H2', nguoi_thuc_hien: 'Nguyễn Văn A', hanh_dong: 'GUI_DUYET', thoi_gian: '2023-09-05T09:00:00Z', ghi_chu: 'Gửi sếp xem xét', trang_thai_cu: TrangThaiTaiLieu.SOAN_THAO, trang_thai_moi: TrangThaiTaiLieu.CHO_DUYET },
        { id: 'H3', nguoi_thuc_hien: 'Trần Thị B', hanh_dong: 'PHE_DUYET', thoi_gian: '2023-09-10T14:00:00Z', ghi_chu: 'Đồng ý nội dung', trang_thai_cu: TrangThaiTaiLieu.CHO_DUYET, trang_thai_moi: TrangThaiTaiLieu.DA_BAN_HANH }
    ]
  },
  {
    id: 'TL005', // Con của TL001
    tai_lieu_cha_id: 'TL001',
    ma_tai_lieu: 'QT-NS-01.HD01',
    ten_tai_lieu: 'Hướng dẫn phỏng vấn ứng viên',
    loai_tai_lieu: 'Hướng dẫn công việc (Work Instruction)',
    linh_vuc: 'Hành chính - Nhân sự',
    tieu_chuan: ['ISO 9001:2015'],
    thu_tu: 1,
    phien_ban: '1.0',
    lan_ban_hanh: 1,
    ngay_ban_hanh: '2023-10-12',
    ngay_hieu_luc: '2023-10-15',
    mo_ta_tom_tat: 'Chi tiết bộ câu hỏi và thang điểm phỏng vấn.',
    id_nguoi_soan_thao: 'NS001',
    id_nguoi_xem_xet: '',
    id_nguoi_phe_duyet: '',
    ngay_tao: '2023-10-11T08:00:00Z',
    id_nguoi_tao: 'NS001',
    ngay_cap_nhat_cuoi: '2023-10-11T08:00:00Z',
    id_nguoi_cap_nhat_cuoi: 'NS001',
    trang_thai: TrangThaiTaiLieu.DA_BAN_HANH,
  },
  {
    id: 'TL006', // Cháu của TL001 (Con của TL005)
    tai_lieu_cha_id: 'TL005',
    ma_tai_lieu: 'QT-NS-01.HD01.BM01',
    ten_tai_lieu: 'Biểu mẫu đánh giá phỏng vấn',
    loai_tai_lieu: 'Biểu mẫu (Form)',
    linh_vuc: 'Hành chính - Nhân sự',
    tieu_chuan: ['ISO 9001:2015'],
    thu_tu: 1,
    phien_ban: '1.0',
    lan_ban_hanh: 1,
    ngay_ban_hanh: '2023-10-12',
    ngay_hieu_luc: '2023-10-15',
    mo_ta_tom_tat: 'Form dùng để ghi điểm trong buổi phỏng vấn.',
    id_nguoi_soan_thao: 'NS001',
    id_nguoi_xem_xet: '',
    id_nguoi_phe_duyet: '',
    ngay_tao: '2023-10-11T09:00:00Z',
    id_nguoi_tao: 'NS001',
    ngay_cap_nhat_cuoi: '2023-10-11T09:00:00Z',
    id_nguoi_cap_nhat_cuoi: 'NS001',
    trang_thai: TrangThaiTaiLieu.DA_BAN_HANH,
  },
  {
    id: 'TL002',
    ma_tai_lieu: 'HD-AT-05',
    ten_tai_lieu: 'Hướng dẫn an toàn lao động tại xưởng',
    loai_tai_lieu: 'Hướng dẫn công việc (Work Instruction)',
    linh_vuc: 'An toàn - Môi trường (HSE)',
    tieu_chuan: ['ISO 14001:2015', 'ISO 45001:2018'],
    thu_tu: 20,
    phien_ban: '1.0',
    lan_ban_hanh: 1,
    ngay_ban_hanh: '2023-12-25',
    ngay_hieu_luc: '2024-01-01',
    chu_ky_ra_soat: 24,
    ngay_ra_soat_tiep_theo: '2026-01-01',
    mo_ta_tom_tat: 'Các quy tắc an toàn bắt buộc khi vận hành máy cắt và máy dập.',
    id_nguoi_soan_thao: 'NS003',
    id_nguoi_xem_xet: 'NS001',
    id_nguoi_phe_duyet: 'NS002',
    ngay_tao: '2023-12-01T09:30:00Z',
    id_nguoi_tao: 'NS003',
    ngay_cap_nhat_cuoi: '2023-12-20T14:15:00Z',
    id_nguoi_cap_nhat_cuoi: 'NS001',
    trang_thai: TrangThaiTaiLieu.DA_BAN_HANH,
    lich_su: [
        { id: 'H1', nguoi_thuc_hien: 'Lê Văn C', hanh_dong: 'TAO_MOI', thoi_gian: '2023-12-01T09:30:00Z' },
        { id: 'H2', nguoi_thuc_hien: 'Phạm Giám Đốc SX', hanh_dong: 'BAN_HANH', thoi_gian: '2023-12-25T08:00:00Z', ghi_chu: 'Ban hành chính thức' }
    ]
  },
  {
    id: 'TL003',
    ma_tai_lieu: 'BM-KT-02',
    ten_tai_lieu: 'Biểu mẫu đề nghị thanh toán',
    loai_tai_lieu: 'Biểu mẫu (Form)',
    linh_vuc: 'Tài chính - Kế toán',
    tieu_chuan: [],
    thu_tu: 15,
    phien_ban: '5.2',
    lan_ban_hanh: 5,
    ngay_ban_hanh: '',
    ngay_hieu_luc: '2024-02-15',
    chu_ky_ra_soat: 12,
    ngay_ra_soat_tiep_theo: '2025-02-15',
    mo_ta_tom_tat: 'Dùng cho các khoản chi nội bộ dưới 20 triệu đồng.',
    id_nguoi_soan_thao: 'NS003',
    id_nguoi_xem_xet: 'NS001',
    id_nguoi_phe_duyet: '',
    ngay_tao: '2024-02-01T08:00:00Z',
    id_nguoi_tao: 'NS003',
    ngay_cap_nhat_cuoi: '2024-02-10T11:00:00Z',
    id_nguoi_cap_nhat_cuoi: 'NS003',
    trang_thai: TrangThaiTaiLieu.CHO_DUYET,
    lich_su: [
         { id: 'H1', nguoi_thuc_hien: 'Phạm Thị E', hanh_dong: 'TAO_MOI', thoi_gian: '2024-02-01T08:00:00Z' },
         { id: 'H2', nguoi_thuc_hien: 'Phạm Thị E', hanh_dong: 'GUI_DUYET', thoi_gian: '2024-02-10T11:00:00Z', ghi_chu: 'Kính gửi chị kế toán trưởng duyệt giúp em' }
    ]
  },
  {
    id: 'TL004',
    ma_tai_lieu: 'KH-KD-2024',
    ten_tai_lieu: 'Kế hoạch kinh doanh năm 2024',
    loai_tai_lieu: 'Kế hoạch (Plan)',
    linh_vuc: 'Kinh doanh - Marketing',
    tieu_chuan: [],
    thu_tu: 5,
    phien_ban: '0.1',
    lan_ban_hanh: 0,
    ngay_ban_hanh: '',
    ngay_hieu_luc: '',
    mo_ta_tom_tat: 'Dự thảo kế hoạch doanh số và mở rộng thị trường miền Bắc.',
    id_nguoi_soan_thao: 'NS003',
    id_nguoi_xem_xet: '',
    id_nguoi_phe_duyet: '',
    ngay_tao: '2024-05-20T13:45:00Z',
    id_nguoi_tao: 'NS003',
    ngay_cap_nhat_cuoi: '2024-05-20T13:45:00Z',
    id_nguoi_cap_nhat_cuoi: 'NS003',
    trang_thai: TrangThaiTaiLieu.SOAN_THAO,
    lich_su: [
        { id: 'H1', nguoi_thuc_hien: 'Vũ Văn F', hanh_dong: 'TAO_MOI', thoi_gian: '2024-05-20T13:45:00Z' }
    ]
  },
];

// --- MOCK RECORDS (HỒ SƠ) ---

export const MOCK_HO_SO: HoSo[] = [
  {
    id: 'HS001',
    ma_ho_so: 'HS-T01-2024',
    tieu_de: 'Biên bản họp xem xét lãnh đạo Q1/2024',
    ma_tai_lieu_lien_quan: 'QT-QL-01',
    phong_ban: 'Ban Giám Đốc',
    nguoi_tao: 'Nguyễn Văn A',
    ngay_tao: '2024-03-30',
    vi_tri_luu_tru: 'Tủ 01 - Ngăn 02 (Bản cứng)',
    dang_luu_tru: 'BAN_CUNG',
    thoi_gian_luu_tru: 36, // 3 năm
    ngay_het_han: '2027-03-30',
    trang_thai: TrangThaiHoSo.LUU_TRU,
    dinh_kem: []
  },
  {
    id: 'HS002',
    ma_ho_so: 'HS-KT-2022-05',
    tieu_de: 'Chứng từ kế toán tháng 05/2022',
    ma_tai_lieu_lien_quan: 'QT-TC-02',
    phong_ban: 'Phòng Kế Toán',
    nguoi_tao: 'Phạm Thị E',
    ngay_tao: '2022-05-31',
    vi_tri_luu_tru: 'Kho lưu trữ 2',
    dang_luu_tru: 'BAN_CUNG',
    thoi_gian_luu_tru: 60, // 5 năm
    ngay_het_han: '2027-05-31',
    trang_thai: TrangThaiHoSo.LUU_TRU
  },
  {
    id: 'HS003',
    ma_ho_so: 'HS-NS-OLD-2018',
    tieu_de: 'Hồ sơ nhân viên đã nghỉ việc 2018',
    phong_ban: 'Phòng HCNS',
    nguoi_tao: 'Admin',
    ngay_tao: '2018-12-31',
    vi_tri_luu_tru: 'Kho số hóa',
    dang_luu_tru: 'BAN_MEM',
    thoi_gian_luu_tru: 60, // 5 năm
    ngay_het_han: '2023-12-31',
    trang_thai: TrangThaiHoSo.CHO_HUY
  }
];

// --- MOCK AUDIT PLAN (NEW) ---

export const MOCK_KE_HOACH_AUDIT: KeHoachDanhGia[] = [
  {
    id: 'KH001',
    ten_ke_hoach: 'Đánh giá nội bộ Q4/2024',
    loai_danh_gia: 'Đánh giá nội bộ (Internal Audit)',
    to_chuc_danh_gia_id: '5', // Ban ISO Nội bộ
    truong_doan_id: '1',      // Nguyễn Văn Kiểm
    thoi_gian_du_kien_start: '2024-10-20',
    thoi_gian_du_kien_end: '2024-10-30',
    muc_tieu: 'Kiểm tra sự tuân thủ quy trình ISO 9001:2015 tại các phòng ban khối Văn phòng.',
    pham_vi: 'Phòng HCNS, Kế toán, Kinh doanh',
    nguoi_tao: 'Nguyễn Văn Kiểm (Lead)',
    ngay_tao: '2024-10-01',
    trang_thai: 'dang_thuc_hien',
    danh_sach_phien: [
       {
         id: 'S1',
         tieu_de: 'Đánh giá quy trình Tuyển dụng & Đào tạo',
         thoi_gian_bat_dau: '2024-10-25T08:30:00',
         thoi_gian_ket_thuc: '2024-10-25T11:30:00',
         phong_ban_duoc_danh_gia: 'Phòng HCNS',
         truong_doan_danh_gia: 'Nguyễn Văn Kiểm (Lead)',
         tai_lieu_lien_quan_ids: ['TL001', 'TL005', 'TL006'], // Links to Document IDs
         trang_thai: 'chua_bat_dau'
       },
       {
         id: 'S2',
         tieu_de: 'Đánh giá quy trình Mua hàng & Thanh toán',
         thoi_gian_bat_dau: '2024-10-26T13:30:00',
         thoi_gian_ket_thuc: '2024-10-26T16:30:00',
         phong_ban_duoc_danh_gia: 'Phòng Kế Toán',
         truong_doan_danh_gia: 'Trần Thị Soát (Member)',
         tai_lieu_lien_quan_ids: ['TL003'],
         trang_thai: 'chua_bat_dau'
       }
    ]
  }
];
