
import { supabase } from '../lib/supabaseClient';
import { MasterDataState, DanhMucItem, NhanSu } from '../types';
import { INITIAL_MASTER_DATA } from '../constants';

// Hàm helper để map dữ liệu từ bảng categories (SQL) sang DanhMucItem (App)
const mapCategoryToItem = (record: any): DanhMucItem => ({
  id: record.id,
  ten: record.name,
  active: record.active,
  thu_tu: record.order || 0, // Map column "order" from DB
  ma_viet_tat: record.code_prefix,
  ...(record.settings || {})
});

// Hàm helper map profile (SQL) sang NhanSu (App)
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

export const fetchMasterDataFromDB = async (): Promise<MasterDataState | null> => {
  try {
    // 1. Tải Categories
    // LƯU Ý: Không dùng .order('order') của SQL để tránh lỗi từ khóa reserved.
    // Sẽ sort bằng JS bên dưới.
    const { data: categoriesData, error: catError } = await supabase
      .from('categories')
      .select('*');

    if (catError) {
        console.error("Supabase Categories Error:", JSON.stringify(catError, null, 2));
        throw catError;
    }

    // 2. Tải Profiles
    const { data: profilesData, error: profError } = await supabase
      .from('profiles')
      .select('*');

    if (profError) {
        console.error("Supabase Profiles Error:", JSON.stringify(profError, null, 2));
        throw profError;
    }

    const categories = categoriesData || [];
    const profiles = profilesData || [];

    // Helper sort function
    const sortByOrder = (a: any, b: any) => (a.order || 0) - (b.order || 0);

    // 3. Phân loại Category và Sort
    const loaiTaiLieu = categories.filter((c: any) => c.type === 'LOAI_TAI_LIEU').sort(sortByOrder).map(mapCategoryToItem);
    const linhVuc = categories.filter((c: any) => c.type === 'LINH_VUC').sort(sortByOrder).map(mapCategoryToItem);
    const boPhan = categories.filter((c: any) => c.type === 'BO_PHAN').sort(sortByOrder).map(mapCategoryToItem);
    const tieuChuan = categories.filter((c: any) => c.type === 'TIEU_CHUAN').sort(sortByOrder).map(mapCategoryToItem);
    
    // Audit Categories
    const toChucDanhGia = categories.filter((c: any) => c.type === 'TO_CHUC_AUDIT').sort(sortByOrder).map(mapCategoryToItem);
    const loaiDanhGia = categories.filter((c: any) => c.type === 'LOAI_AUDIT').sort(sortByOrder).map(mapCategoryToItem);
    const auditors = categories.filter((c: any) => c.type === 'AUDITOR').sort(sortByOrder).map(mapCategoryToItem);

    // 4. Map Profiles -> NhanSu
    const nhanSu = profiles.map((p: any) => mapProfileToUser(p, boPhan));

    // Nếu DB chưa có dữ liệu quan trọng, trả về null để App dùng Mock Data
    if (loaiTaiLieu.length === 0 && boPhan.length === 0 && nhanSu.length === 0) {
        console.log("DB trống, sử dụng Mock Data.");
        return null;
    }

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

  } catch (error) {
    // Log lỗi chi tiết
    console.error("Lỗi khi tải Master Data từ Supabase (Chi tiết):", error);
    return null; // Fallback về Mock Data
  }
};
