
import { supabase } from '../lib/supabaseClient';
import { MasterDataState, DanhMucItem, NhanSu, TaiLieu, HoSo, KeHoachDanhGia } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

// --- HELPERS MAPPING ---

const mapCategoryToItem = (record: any): DanhMucItem => ({
  id: record.id,
  ten: record.ten,
  active: record.hoat_dong,
  thu_tu: record.thu_tu || 0,
  ma_viet_tat: record.ma_viet_tat,
  parentId: record.id_cha,
  ...(record.cai_dat || {})
});

// Ngược lại: Từ App Item -> DB Record
const mapItemToCategoryPayload = (item: DanhMucItem, type: string) => ({
    id: item.id,
    loai: type,
    ten: item.ten,
    hoat_dong: item.active,
    thu_tu: item.thu_tu,
    ma_viet_tat: item.ma_viet_tat,
    id_cha: item.parentId,
    cai_dat: {
        ky_tu_noi: item.ky_tu_noi,
        do_dai_so: item.do_dai_so
    }
});

const mapProfileToUser = (record: any, depts: DanhMucItem[]): NhanSu => {
  const deptName = depts.find(d => d.id === record.id_phong_ban)?.ten || '';
  return {
    id: record.id,
    ho_ten: record.ho_ten,
    email: record.email || '',
    chuc_vu: record.chuc_vu || 'Nhân viên',
    phong_ban: deptName,
    roles: record.quyen || [],
    thu_tu: record.thu_tu || 0,
    avatar: record.anh_dai_dien
  };
};

const mapUserToProfilePayload = (user: NhanSu, depts: DanhMucItem[]) => {
    // Tìm ID phòng ban từ tên (Mapping ngược)
    const deptId = depts.find(d => d.ten === user.phong_ban)?.id || null;
    return {
        id: user.id,
        ho_ten: user.ho_ten,
        email: user.email,
        chuc_vu: user.chuc_vu,
        id_phong_ban: deptId,
        quyen: user.roles,
        thu_tu: user.thu_tu,
        anh_dai_dien: user.avatar
    };
};

const sortByOrder = (a: any, b: any) => (a.thu_tu || 0) - (b.thu_tu || 0);

// --- 1. MASTER DATA ---

export const fetchMasterDataFromDB = async (): Promise<MasterDataState | null> => {
  try {
    const { data: categoriesData, error: catError } = await supabase.from('danh_muc').select('*');
    if (catError) throw catError;

    const { data: profilesData, error: profError } = await supabase.from('nhan_su').select('*');
    if (profError) throw profError;

    const categories = categoriesData || [];
    const profiles = profilesData || [];

    const sortIt = (arr: any[]) => arr.sort(sortByOrder);

    const loaiTaiLieu = sortIt(categories.filter((c: any) => c.loai === 'LOAI_TAI_LIEU').map(mapCategoryToItem));
    const linhVuc = sortIt(categories.filter((c: any) => c.loai === 'LINH_VUC').map(mapCategoryToItem));
    const boPhan = sortIt(categories.filter((c: any) => c.loai === 'BO_PHAN').map(mapCategoryToItem));
    const tieuChuan = sortIt(categories.filter((c: any) => c.loai === 'TIEU_CHUAN').map(mapCategoryToItem));
    const toChucDanhGia = sortIt(categories.filter((c: any) => c.loai === 'TO_CHUC_AUDIT').map(mapCategoryToItem));
    const loaiDanhGia = sortIt(categories.filter((c: any) => c.loai === 'LOAI_AUDIT').map(mapCategoryToItem));
    const auditors = sortIt(categories.filter((c: any) => c.loai === 'AUDITOR').map(mapCategoryToItem));

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
        console.warn("⚠️ Lỗi tải Master Data:", JSON.stringify(error, null, 2));
    }
    return null;
  }
};

// CRUD Danh Mục
export const upsertCategory = async (item: DanhMucItem, type: string) => {
    const payload = mapItemToCategoryPayload(item, type);
    const { error } = await supabase.from('danh_muc').upsert(payload);
    if (error) {
        console.error('Lỗi lưu danh mục:', error);
        throw error;
    }
};

export const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('danh_muc').delete().eq('id', id);
    if (error) {
        console.error('Lỗi xóa danh mục:', error);
        throw error;
    }
};

// CRUD Nhân Sự
export const upsertProfile = async (user: NhanSu, allDepts: DanhMucItem[]) => {
    const payload = mapUserToProfilePayload(user, allDepts);
    const { error } = await supabase.from('nhan_su').upsert(payload);
    if (error) {
        console.error('Lỗi lưu nhân sự:', error);
        throw error;
    }
};

export const deleteProfile = async (id: string) => {
    const { error } = await supabase.from('nhan_su').delete().eq('id', id);
    if (error) throw error;
};

// --- 2. TAI LIEU (DOCUMENTS) ---

export const fetchDocumentsFromDB = async (): Promise<TaiLieu[] | null> => {
    try {
        const { data, error } = await supabase.from('tai_lieu').select('*').order('ngay_tao', { ascending: false });
        if (error) {
            console.warn("⚠️ Lỗi tải Tài liệu:", JSON.stringify(error, null, 2));
            return null;
        }
        return data as TaiLieu[];
    } catch (error) {
        console.error("Exception tải Tài liệu:", error);
        return null;
    }
};

export const upsertDocument = async (doc: TaiLieu) => {
    // Chuyển đổi nếu cần, nhưng hiện tại TaiLieu interface map 1:1 với tên cột DB
    const { error } = await supabase.from('tai_lieu').upsert(doc);
    if (error) {
        console.error('Lỗi lưu tài liệu:', error);
        throw error;
    }
};

export const deleteDocument = async (id: string) => {
    const { error } = await supabase.from('tai_lieu').delete().eq('id', id);
    if (error) throw error;
};

// --- 3. HO SO (RECORDS) ---

export const fetchRecordsFromDB = async (): Promise<HoSo[] | null> => {
    try {
        const { data, error } = await supabase.from('ho_so').select('*').order('ngay_tao', { ascending: false });
        if (error) {
             console.warn("⚠️ Lỗi tải Hồ sơ:", JSON.stringify(error, null, 2));
             return null;
        }
        return data as HoSo[];
    } catch (error) {
        console.error("Exception tải Hồ sơ:", error);
        return null;
    }
};

export const upsertRecord = async (rec: HoSo) => {
    const { error } = await supabase.from('ho_so').upsert(rec);
    if (error) {
        console.error('Lỗi lưu hồ sơ:', error);
        throw error;
    }
};

export const deleteRecord = async (id: string) => {
    const { error } = await supabase.from('ho_so').delete().eq('id', id);
    if (error) throw error;
};

// --- 4. AUDIT PLANS ---

export const fetchAuditPlansFromDB = async (): Promise<KeHoachDanhGia[] | null> => {
    try {
        const { data, error } = await supabase.from('ke_hoach_danh_gia').select('*').order('ngay_tao', { ascending: false });
        if (error) {
             console.warn("⚠️ Lỗi tải Kế hoạch Audit:", JSON.stringify(error, null, 2));
             return null;
        }
        return data as KeHoachDanhGia[];
    } catch (error) {
        console.error("Exception tải Kế hoạch Audit:", error);
        return null;
    }
};

export const upsertAuditPlan = async (plan: KeHoachDanhGia) => {
    const { error } = await supabase.from('ke_hoach_danh_gia').upsert(plan);
    if (error) {
        console.error('Lỗi lưu kế hoạch:', error);
        throw error;
    }
};

export const deleteAuditPlan = async (id: string) => {
    const { error } = await supabase.from('ke_hoach_danh_gia').delete().eq('id', id);
    if (error) throw error;
};
