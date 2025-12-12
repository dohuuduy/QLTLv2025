
import { supabase } from '../lib/supabaseClient';
import { MasterDataState, DanhMucItem, NhanSu, TaiLieu, HoSo, KeHoachDanhGia } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

// --- HELPERS MAPPING ---
// Chuyển đổi từ cột DB (Tiếng Việt snake_case) -> App Type (CamelCase/Mixed)

const mapCategoryToItem = (record: any): DanhMucItem => ({
  id: record.id,
  ten: record.ten,            // DB: ten
  active: record.hoat_dong,   // DB: hoat_dong
  thu_tu: record.thu_tu || 0, // DB: thu_tu
  ma_viet_tat: record.ma_viet_tat, // DB: ma_viet_tat
  parentId: record.id_cha,    // DB: id_cha
  ...(record.cai_dat || {})   // DB: cai_dat (JSONB)
});

const mapProfileToUser = (record: any, depts: DanhMucItem[]): NhanSu => {
  // DB: id_phong_ban
  const deptName = depts.find(d => d.id === record.id_phong_ban)?.ten || '';
  return {
    id: record.id,
    ho_ten: record.ho_ten,       // DB: ho_ten
    email: record.email || '',
    chuc_vu: record.chuc_vu || 'Nhân viên', // DB: chuc_vu
    phong_ban: deptName,
    roles: record.quyen || [],   // DB: quyen (Array)
    thu_tu: record.thu_tu || 0,
    avatar: record.anh_dai_dien  // DB: anh_dai_dien
  };
};

const sortByOrder = (a: any, b: any) => (a.order || 0) - (b.order || 0);

// --- FETCH MASTER DATA (DANH MUC & NHAN SU) ---
export const fetchMasterDataFromDB = async (): Promise<MasterDataState | null> => {
  try {
    // 1. Tải Danh Mục (Table: danh_muc)
    const { data: categoriesData, error: catError } = await supabase.from('danh_muc').select('*');
    if (catError) throw catError;

    // 2. Tải Nhân Sự (Table: nhan_su)
    const { data: profilesData, error: profError } = await supabase.from('nhan_su').select('*');
    if (profError) throw profError;

    const categories = categoriesData || [];
    const profiles = profilesData || [];

    // Helper sort
    const sortIt = (arr: any[]) => arr.sort((a, b) => (a.thu_tu || 0) - (b.thu_tu || 0));

    // 3. Phân loại Category dựa trên cột 'loai'
    const loaiTaiLieu = sortIt(categories.filter((c: any) => c.loai === 'LOAI_TAI_LIEU').map(mapCategoryToItem));
    const linhVuc = sortIt(categories.filter((c: any) => c.loai === 'LINH_VUC').map(mapCategoryToItem));
    const boPhan = sortIt(categories.filter((c: any) => c.loai === 'BO_PHAN').map(mapCategoryToItem));
    const tieuChuan = sortIt(categories.filter((c: any) => c.loai === 'TIEU_CHUAN').map(mapCategoryToItem));
    
    // Audit Categories
    const toChucDanhGia = sortIt(categories.filter((c: any) => c.loai === 'TO_CHUC_AUDIT').map(mapCategoryToItem));
    const loaiDanhGia = sortIt(categories.filter((c: any) => c.loai === 'LOAI_AUDIT').map(mapCategoryToItem));
    const auditors = sortIt(categories.filter((c: any) => c.loai === 'AUDITOR').map(mapCategoryToItem));

    // 4. Map Profiles -> NhanSu
    const nhanSu = profiles.map((p: any) => mapProfileToUser(p, boPhan));

    if (categories.length === 0 && profiles.length === 0) return null;

    return {
      loaiTaiLieu: loaiTaiLieu.length ? loaiTaiLieu : INITIAL_MASTER_DATA.loaiTaiLieu,
      linhVuc: linhVuc.length ? linhVuc : INITIAL_MASTER_DATA.linhVuc,
      boPhan: boPhan.length ? boPhan : INITIAL_MASTER_DATA.boPhan,
      tieuChuan: tieuChuan.length ? tieuChuan : INITIAL_MASTER_DATA.tieuChuan,
      nhanSu: nhanSu.length ? nhanSu : INITIAL_MASTER_DATA.nhanSu,
      toChucDanhGia: toChucDanhGia.length ? toChucDanhGia : INITIAL_MASTER_DATA.toChucDanhGia,
      auditors: auditors.length ? auditors : INITIAL_MASTER_DATA.auditors,
      loaiDanhGia: loaiDanhGia.length ? loaiDanhGia : INITIAL_MASTER_DATA.loaiDanhGia,
    };

  } catch (error: any) {
    if (!error?.message?.includes('Invalid API key') && error?.code !== 'PGRST301') {
        console.warn("⚠️ Lỗi tải Master Data (danh_muc/nhan_su):", JSON.stringify(error, null, 2));
    }
    return null;
  }
};

// --- FETCH DOCUMENTS (Table: tai_lieu) ---
export const fetchDocumentsFromDB = async (): Promise<TaiLieu[] | null> => {
    try {
        // Cột trong DB đã đặt tên trùng với Interface TaiLieu (ma_tai_lieu, ten_tai_lieu...) nên không cần map
        const { data, error } = await supabase.from('tai_lieu').select('*').order('ngay_tao', { ascending: false });
        
        if (error) {
            console.warn("⚠️ Lỗi tải Tài liệu (tai_lieu):", JSON.stringify(error, null, 2));
            return null;
        }
        return data as TaiLieu[];
    } catch (error) {
        console.error("Exception tải Tài liệu:", error);
        return null;
    }
};

// --- FETCH RECORDS (Table: ho_so) ---
export const fetchRecordsFromDB = async (): Promise<HoSo[] | null> => {
    try {
        const { data, error } = await supabase.from('ho_so').select('*').order('ngay_tao', { ascending: false });
        if (error) {
             console.warn("⚠️ Lỗi tải Hồ sơ (ho_so):", JSON.stringify(error, null, 2));
             return null;
        }
        return data as HoSo[];
    } catch (error) {
        console.error("Exception tải Hồ sơ:", error);
        return null;
    }
};

// --- FETCH AUDIT PLANS (Table: ke_hoach_danh_gia) ---
export const fetchAuditPlansFromDB = async (): Promise<KeHoachDanhGia[] | null> => {
    try {
        const { data, error } = await supabase.from('ke_hoach_danh_gia').select('*').order('ngay_tao', { ascending: false });
        if (error) {
             console.warn("⚠️ Lỗi tải Kế hoạch (ke_hoach_danh_gia):", JSON.stringify(error, null, 2));
             return null;
        }
        return data as KeHoachDanhGia[];
    } catch (error) {
        console.error("Exception tải Kế hoạch Audit:", error);
        return null;
    }
};
