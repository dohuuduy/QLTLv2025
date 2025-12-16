
import { supabase } from '../lib/supabaseClient';
import { MasterDataState, DanhMucItem, NhanSu, TaiLieu, HoSo, KeHoachDanhGia } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

// --- AUTH SERVICES ---

export const signIn = async (email: string, password: string) => {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
};

export const signOut = async () => {
  return await supabase.auth.signOut();
};

export const signUpNewUser = async (email: string, password: string, metaData: any) => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metaData
            }
        });
        return { data, error };
    } catch (e: any) {
        return { data: { user: null, session: null }, error: { message: e.message } };
    }
};

export const getCurrentSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session || null, error };
  } catch (error) {
    console.warn("Auth Session Error:", error);
    return { session: null, error };
  }
};

export const checkSystemHasAdmin = async (): Promise<boolean> => {
    try {
        const { count, error } = await supabase
            .from('nhan_su')
            .select('*', { count: 'exact', head: true })
            .contains('quyen', ['QUAN_TRI']);
        
        if (error) {
             console.warn("⚠️ Check Admin Error (Using Mock Mode - Defaulting to TRUE to disable setup):", error.message);
             return true; 
        }
        return (count || 0) > 0;
    } catch (e) {
        return true; 
    }
};

// --- HELPERS MAPPING ---

const mapCategoryToItem = (record: any): DanhMucItem => ({
  id: record.id,
  ten: record.ten,
  active: record.hoat_dong,
  thu_tu: record.thu_tu || 0,
  ma_viet_tat: record.ma_viet_tat,
  parentId: record.id_cha,
  // Fix: Prioritize 'cap_do' column from DB, fallback to 'cai_dat.cap_do' for legacy data
  cap_do: record.cap_do !== undefined && record.cap_do !== null ? record.cap_do : record.cai_dat?.cap_do,
  ...(record.cai_dat || {}) 
});

const mapItemToCategoryPayload = (item: DanhMucItem, type: string) => {
    const payload: any = {
        id: item.id,
        loai: type,
        ten: item.ten,
        hoat_dong: item.active,
        thu_tu: item.thu_tu,
        ma_viet_tat: item.ma_viet_tat,
        id_cha: item.parentId,
        cai_dat: {
            ky_tu_noi: item.ky_tu_noi,
            do_dai_so: item.do_dai_so,
        }
    };

    // Explicitly map cap_do to the root level if it exists
    if (item.cap_do !== undefined && item.cap_do !== null) {
        payload.cap_do = item.cap_do;
    }

    return payload;
};

const mapProfileToUser = (record: any, depts: DanhMucItem[], positions: DanhMucItem[]): NhanSu => {
  const deptName = depts.find(d => d.id === record.id_phong_ban)?.ten || '';
  const posName = positions.find(p => p.id === record.id_chuc_vu)?.ten || record.chuc_vu || '';
  
  return {
    id: record.id,
    ho_ten: record.ho_ten,
    email: record.email || '',
    chuc_vu: posName,
    phong_ban: deptName,
    roles: record.quyen || [],
    thu_tu: record.thu_tu || 0,
    avatar: record.anh_dai_dien
  };
};

const mapUserToProfilePayload = (user: NhanSu, depts: DanhMucItem[], positions: DanhMucItem[]) => {
    const deptId = depts.find(d => d.ten === user.phong_ban)?.id || null;
    const posId = positions.find(p => p.ten === user.chuc_vu)?.id || null;

    return {
        id: user.id,
        ho_ten: user.ho_ten,
        email: user.email,
        id_chuc_vu: posId,
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
    if (catError) {
        console.warn("⚠️ Failed to load Categories:", catError.message);
        return null; 
    }

    const { data: profilesData, error: profError } = await supabase.from('nhan_su').select('*');
    if (profError) {
        console.warn("⚠️ Failed to load Profiles:", profError.message);
        return null;
    }

    const categories = categoriesData || [];
    const profiles = profilesData || [];

    const sortIt = (arr: any[]) => arr.sort(sortByOrder);

    const loaiTaiLieu = sortIt(categories.filter((c: any) => c.loai === 'LOAI_TAI_LIEU').map(mapCategoryToItem));
    const linhVuc = sortIt(categories.filter((c: any) => c.loai === 'LINH_VUC').map(mapCategoryToItem));
    const boPhan = sortIt(categories.filter((c: any) => c.loai === 'BO_PHAN').map(mapCategoryToItem));
    const chucVu = sortIt(categories.filter((c: any) => c.loai === 'CHUC_VU').map(mapCategoryToItem));
    const tieuChuan = sortIt(categories.filter((c: any) => c.loai === 'TIEU_CHUAN').map(mapCategoryToItem));
    const toChucDanhGia = sortIt(categories.filter((c: any) => c.loai === 'TO_CHUC_AUDIT').map(mapCategoryToItem));
    const loaiDanhGia = sortIt(categories.filter((c: any) => c.loai === 'LOAI_AUDIT').map(mapCategoryToItem));
    const auditors = sortIt(categories.filter((c: any) => c.loai === 'AUDITOR').map(mapCategoryToItem));

    const nhanSu = profiles.map((p: any) => mapProfileToUser(p, boPhan, chucVu));

    if (categories.length === 0 && profiles.length === 0) return null;

    return {
      loaiTaiLieu: loaiTaiLieu.length ? loaiTaiLieu : INITIAL_MASTER_DATA.loaiTaiLieu,
      linhVuc: linhVuc.length ? linhVuc : INITIAL_MASTER_DATA.linhVuc,
      boPhan: boPhan.length ? boPhan : INITIAL_MASTER_DATA.boPhan,
      chucVu: chucVu.length ? chucVu : INITIAL_MASTER_DATA.chucVu,
      tieuChuan: tieuChuan.length ? tieuChuan : INITIAL_MASTER_DATA.tieuChuan,
      nhanSu: nhanSu.length ? nhanSu : INITIAL_MASTER_DATA.nhanSu,
      toChucDanhGia: toChucDanhGia.length ? toChucDanhGia : INITIAL_MASTER_DATA.toChucDanhGia,
      auditors: auditors.length ? auditors : INITIAL_MASTER_DATA.auditors,
      loaiDanhGia: loaiDanhGia.length ? loaiDanhGia : INITIAL_MASTER_DATA.loaiDanhGia,
    };
  } catch (error: any) {
    console.warn("⚠️ Critical Exception in fetchMasterDataFromDB:", error);
    return null;
  }
};

export const upsertCategory = async (item: DanhMucItem, type: string) => {
    const payload = mapItemToCategoryPayload(item, type);
    const { error } = await supabase.from('danh_muc').upsert(payload);
    if (error) { console.error('Upsert Category Error:', error); throw error; }
};

export const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('danh_muc').delete().eq('id', id);
    if (error) throw error;
};

export const upsertProfile = async (user: NhanSu, allDepts: DanhMucItem[], allPositions: DanhMucItem[]) => {
    const payload = mapUserToProfilePayload(user, allDepts, allPositions);
    const { error } = await supabase.from('nhan_su').upsert(payload);
    if (error) { console.error('Upsert Profile Error:', error); throw error; }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user.id === user.id) {
            await supabase.auth.updateUser({ data: { full_name: user.ho_ten } });
        }
    } catch (e) {}
};

export const deleteProfile = async (id: string) => {
    const { error } = await supabase.from('nhan_su').delete().eq('id', id);
    if (error) throw error;
};

// --- DOCS ---

export const fetchDocumentsFromDB = async (): Promise<TaiLieu[] | null> => {
    try {
        const { data, error } = await supabase.from('tai_lieu').select('*').order('ngay_tao', { ascending: false });
        if (error) { console.warn("Fetch Docs Error:", error.message); return null; }
        
        return (data || []).map((d: any) => ({
            ...d,
            nguoi_soan_thao: d.id_nguoi_soan_thao || d.nguoi_soan_thao,
            nguoi_xem_xet: d.id_nguoi_xem_xet || d.nguoi_xem_xet,
            nguoi_phe_duyet: d.id_nguoi_phe_duyet || d.nguoi_phe_duyet,
            nguoi_tao: d.id_nguoi_tao || d.nguoi_tao,
            nguoi_cap_nhat_cuoi: d.id_nguoi_cap_nhat_cuoi || d.nguoi_cap_nhat_cuoi
        })) as TaiLieu[];
    } catch { return null; }
};

export const upsertDocument = async (doc: TaiLieu) => {
    const { 
        nguoi_soan_thao,
        nguoi_xem_xet,
        nguoi_phe_duyet,
        nguoi_tao,
        nguoi_cap_nhat_cuoi,
        ...rest 
    } = doc as any;

    const payload = {
        ...rest,
        id_nguoi_soan_thao: nguoi_soan_thao || null,
        id_nguoi_xem_xet: nguoi_xem_xet || null,
        id_nguoi_phe_duyet: nguoi_phe_duyet || null,
        id_nguoi_tao: nguoi_tao,
        id_nguoi_cap_nhat_cuoi: nguoi_cap_nhat_cuoi
    };
    
    const { error } = await supabase.from('tai_lieu').upsert(payload);
    if (error) {
        console.error("Upsert Document Error:", error); 
        throw error;
    }
};

export const deleteDocument = async (id: string) => {
    const { error } = await supabase.from('tai_lieu').delete().eq('id', id);
    if (error) throw error;
};

// --- RECORDS ---

export const fetchRecordsFromDB = async (): Promise<HoSo[] | null> => {
    try {
        const { data, error } = await supabase.from('ho_so').select('*').order('ngay_tao', { ascending: false });
        if (error) { console.warn("Fetch Records Error:", error.message); return null; }
        return data as HoSo[];
    } catch { return null; }
};

export const upsertRecord = async (rec: HoSo) => {
    const { error } = await supabase.from('ho_so').upsert(rec);
    if (error) throw error;
};

export const deleteRecord = async (id: string) => {
    const { error } = await supabase.from('ho_so').delete().eq('id', id);
    if (error) throw error;
};

// --- AUDIT ---

export const fetchAuditPlansFromDB = async (): Promise<KeHoachDanhGia[] | null> => {
    try {
        const { data, error } = await supabase.from('ke_hoach_danh_gia').select('*').order('ngay_tao', { ascending: false });
        if (error) { console.warn("Fetch Audit Error:", error.message); return null; }
        return data as KeHoachDanhGia[];
    } catch { return null; }
};

export const upsertAuditPlan = async (plan: KeHoachDanhGia) => {
    const { error } = await supabase.from('ke_hoach_danh_gia').upsert(plan);
    if (error) throw error;
};

export const deleteAuditPlan = async (id: string) => {
    const { error } = await supabase.from('ke_hoach_danh_gia').delete().eq('id', id);
    if (error) throw error;
};
