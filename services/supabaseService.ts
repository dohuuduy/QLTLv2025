
import { supabase } from '../lib/supabaseClient';
import { MasterDataState, DanhMucItem, NhanSu, TaiLieu, HoSo, KeHoachDanhGia } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

// --- HELPERS ---
const mapCategoryToItem = (record: any): DanhMucItem => ({
  id: record.id,
  ten: record.name,
  active: record.active,
  thu_tu: record.order || 0, 
  ma_viet_tat: record.code_prefix,
  parentId: record.parent_id, // Map parent_id
  ...(record.settings || {})
});

const mapProfileToUser = (record: any, depts: DanhMucItem[]): NhanSu => {
  const deptName = depts.find(d => d.id === record.department_id)?.ten || '';
  return {
    id: record.id,
    ho_ten: record.full_name,
    email: record.email || '',
    chuc_vu: record.job_title || 'Nhân viên',
    phong_ban: deptName,
    roles: record.roles || [],
    thu_tu: 0,
    avatar: record.avatar_url
  };
};

const sortByOrder = (a: any, b: any) => (a.order || 0) - (b.order || 0);

// --- FETCH MASTER DATA ---
export const fetchMasterDataFromDB = async (): Promise<MasterDataState | null> => {
  try {
    // 1. Tải Categories
    const { data: categoriesData, error: catError } = await supabase.from('categories').select('*');
    if (catError) throw catError;

    // 2. Tải Profiles
    const { data: profilesData, error: profError } = await supabase.from('profiles').select('*');
    if (profError) throw profError;

    const categories = categoriesData || [];
    const profiles = profilesData || [];

    // 3. Phân loại Category
    const loaiTaiLieu = categories.filter((c: any) => c.type === 'LOAI_TAI_LIEU').sort(sortByOrder).map(mapCategoryToItem);
    const linhVuc = categories.filter((c: any) => c.type === 'LINH_VUC').sort(sortByOrder).map(mapCategoryToItem);
    const boPhan = categories.filter((c: any) => c.type === 'BO_PHAN').sort(sortByOrder).map(mapCategoryToItem);
    const tieuChuan = categories.filter((c: any) => c.type === 'TIEU_CHUAN').sort(sortByOrder).map(mapCategoryToItem);
    
    // Audit Categories
    const toChucDanhGia = categories.filter((c: any) => c.type === 'TO_CHUC_AUDIT').sort(sortByOrder).map(mapCategoryToItem);
    const loaiDanhGia = categories.filter((c: any) => c.type === 'LOAI_AUDIT').sort(sortByOrder).map(mapCategoryToItem);
    const auditors = categories.filter((c: any) => c.type === 'AUDITOR').sort(sortByOrder).map(mapCategoryToItem);

    // 4. Map Profiles
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
    // Chỉ log lỗi nếu không phải do chưa cấu hình Key
    if (!error?.message?.includes('Invalid API key')) {
        console.warn("⚠️ Không tải được Master Data (Sẽ dùng Mock Data). Lỗi:", JSON.stringify(error, null, 2));
    }
    return null;
  }
};

// --- FETCH DOCUMENTS (TÀI LIỆU) ---
export const fetchDocumentsFromDB = async (): Promise<TaiLieu[] | null> => {
    try {
        const { data, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
        
        if (error) {
            // Log rõ lỗi JSON để debug
            console.warn("⚠️ Lỗi tải Tài liệu (Supabase):", JSON.stringify(error, null, 2));
            return null; // Trả về null để App dùng Mock Data
        }

        return data as TaiLieu[];
    } catch (error) {
        console.error("Exception tải Tài liệu:", error);
        return null;
    }
};

// --- FETCH RECORDS (HỒ SƠ) ---
export const fetchRecordsFromDB = async (): Promise<HoSo[] | null> => {
    try {
        const { data, error } = await supabase.from('records').select('*').order('created_at', { ascending: false });
        if (error) {
             console.warn("⚠️ Lỗi tải Hồ sơ (Supabase):", JSON.stringify(error, null, 2));
             return null;
        }
        return data as HoSo[];
    } catch (error) {
        console.error("Exception tải Hồ sơ:", error);
        return null;
    }
};

// --- FETCH AUDIT PLANS (KẾ HOẠCH) ---
export const fetchAuditPlansFromDB = async (): Promise<KeHoachDanhGia[] | null> => {
    try {
        const { data, error } = await supabase.from('audit_plans').select('*').order('created_at', { ascending: false });
        if (error) {
             console.warn("⚠️ Lỗi tải Kế hoạch Audit (Supabase):", JSON.stringify(error, null, 2));
             return null;
        }
        return data as KeHoachDanhGia[];
    } catch (error) {
        console.error("Exception tải Kế hoạch Audit:", error);
        return null;
    }
};
