
import React, { useState, useEffect } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { X, Save, Info, Calendar, UserCheck, FileType, Check, Paperclip, Trash2, Plus, Link as LinkIcon, FileText, FileSpreadsheet, File, RefreshCw, GitBranch, Clock, AlertCircle, Lock, Unlock, Hash, ExternalLink } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { MOCK_TAI_LIEU } from '../../constants'; 
import { useDialog } from '../../contexts/DialogContext';

interface TaiLieuFormProps {
  initialData?: TaiLieu | null;
  onSave: (data: Partial<TaiLieu>) => void;
  onCancel: () => void;
  masterData: MasterDataState;
  fullList?: TaiLieu[]; // NEW: Nhận danh sách đầy đủ để đếm số lượng con
}

export const TaiLieuForm: React.FC<TaiLieuFormProps> = ({ initialData, onSave, onCancel, masterData, fullList = [] }) => {
  const [formData, setFormData] = useState<Partial<TaiLieu>>({
    ma_tai_lieu: '',
    ten_tai_lieu: '',
    loai_tai_lieu: '',
    linh_vuc: '',
    tieu_chuan: [],
    tai_lieu_cha_id: '',
    thu_tu: 0,
    phien_ban: '1.0',
    lan_ban_hanh: 1,
    ngay_ban_hanh: '',
    ngay_hieu_luc: '',
    chu_ky_ra_soat: 12,
    ngay_ra_soat_tiep_theo: '',
    bo_phan_soan_thao: '',
    nguoi_soan_thao: '',
    nguoi_xem_xet: '',
    nguoi_phe_duyet: '',
    mo_ta_tom_tat: '',
    dinh_kem: [],
    trang_thai: TrangThaiTaiLieu.SOAN_THAO,
  });

  const [urlInput, setUrlInput] = useState('');
  const [isCodeLocked, setIsCodeLocked] = useState(false); // Trạng thái khóa ô Mã tài liệu
  const dialog = useDialog();

  // Lấy danh sách tài liệu có thể làm cha
  const availableParents = fullList.filter(d => d.id !== initialData?.id).map(d => ({
      value: d.id,
      label: d.ten_tai_lieu,
      subLabel: d.ma_tai_lieu
  }));

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsCodeLocked(false); // Nếu sửa, mặc định cho sửa mã (hoặc lock tùy ý)
    } else {
        // Nếu tạo mới, mặc định lock để auto-gen
        setIsCodeLocked(true);
    }
  }, [initialData]);

  // AUTO-NUMBERING LOGIC
  useEffect(() => {
      // Chỉ chạy khi tạo mới hoặc đang bật chế độ khóa (Auto)
      if (initialData || !isCodeLocked) return;
      
      // Cần có Loại tài liệu để xác định Prefix
      if (!formData.loai_tai_lieu) return;

      const docTypeConfig = masterData.loaiTaiLieu.find(t => t.ten === formData.loai_tai_lieu);
      if (!docTypeConfig) return;

      const prefix = docTypeConfig.ma_viet_tat || '';
      const separator = docTypeConfig.ky_tu_noi || '.';
      const digitCount = docTypeConfig.do_dai_so || 2;

      let newCode = '';

      if (formData.tai_lieu_cha_id) {
          // Logic con: Mã cha + Sep + Prefix + AutoNum
          const parentDoc = fullList.find(d => d.id === formData.tai_lieu_cha_id);
          if (parentDoc) {
             // Đếm số lượng anh em cùng cha và cùng loại
             const siblings = fullList.filter(d => 
                d.tai_lieu_cha_id === parentDoc.id && 
                d.loai_tai_lieu === formData.loai_tai_lieu &&
                d.id !== initialData?.id // Trừ chính nó (nếu có - dù đây là create new)
             );
             const nextNum = siblings.length + 1;
             const paddedNum = String(nextNum).padStart(digitCount, '0');
             newCode = `${parentDoc.ma_tai_lieu}${separator}${prefix}${paddedNum}`;
          }
      } else {
          // Logic root (Nếu cần): Prefix + AutoNum (Đếm số lượng root docs cùng loại)
          // Tạm thời chỉ áp dụng nếu có config prefix, nếu không để trống user tự nhập
          if (prefix) {
             const rootSiblings = fullList.filter(d => 
                !d.tai_lieu_cha_id && 
                d.loai_tai_lieu === formData.loai_tai_lieu
             );
             // Logic này đơn giản, thực tế Root code phức tạp hơn
             // newCode = `${prefix}${String(rootSiblings.length + 1).padStart(digitCount, '0')}`;
          }
      }

      if (newCode && newCode !== formData.ma_tai_lieu) {
          setFormData(prev => ({ ...prev, ma_tai_lieu: newCode }));
      }

  }, [formData.tai_lieu_cha_id, formData.loai_tai_lieu, isCodeLocked, fullList, masterData.loaiTaiLieu, initialData]);


  useEffect(() => {
    if (formData.ngay_hieu_luc && formData.chu_ky_ra_soat) {
        try {
            const hieuLucDate = new Date(formData.ngay_hieu_luc);
            const nextDate = addMonths(hieuLucDate, formData.chu_ky_ra_soat);
            const formattedNextDate = format(nextDate, 'yyyy-MM-dd');
            
            if (formattedNextDate !== formData.ngay_ra_soat_tiep_theo) {
                setFormData(prev => ({ ...prev, ngay_ra_soat_tiep_theo: formattedNextDate }));
            }
        } catch (e) {
            console.error("Lỗi tính ngày rà soát", e);
        }
    }
  }, [formData.ngay_hieu_luc, formData.chu_ky_ra_soat]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const finalValue = (name === 'chu_ky_ra_soat' || name === 'thu_tu' || name === 'lan_ban_hanh') 
        ? (value === '' ? 0 : parseInt(value))
        : value;

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSelectChange = (key: keyof TaiLieu, value: any) => {
      setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleTieuChuan = (tieuChuanName: string) => {
    const currentList = formData.tieu_chuan || [];
    if (currentList.includes(tieuChuanName)) {
      setFormData(prev => ({
        ...prev,
        tieu_chuan: currentList.filter(item => item !== tieuChuanName)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        tieu_chuan: [...currentList, tieuChuanName]
      }));
    }
  };

  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || urlObj.hostname;
      return filename.length > 40 ? filename.substring(0, 40) + '...' : filename;
    } catch (e) {
      return url.length > 40 ? url.substring(0, 40) + '...' : url;
    }
  };

  const handleAddFile = (selectedType: 'pdf' | 'doc' | 'excel') => {
    if (!urlInput.trim()) {
      dialog.alert("Vui lòng dán đường dẫn (Link) vào ô trống trước khi chọn loại file!", { type: 'warning' });
      return;
    }
    const name = getFileNameFromUrl(urlInput);
    const file: DinhKem = {
      id: `file_${Date.now()}`,
      ten_file: name,
      url: urlInput,
      loai: selectedType,
      ngay_upload: new Date().toISOString()
    };
    setFormData(prev => ({ ...prev, dinh_kem: [...(prev.dinh_kem || []), file] }));
    setUrlInput('');
  };

  const removeFile = (fileId: string) => {
    setFormData(prev => ({ ...prev, dinh_kem: (prev.dinh_kem || []).filter(f => f.id !== fileId) }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const getFileTypeConfig = (type: string) => {
    switch(type) {
      case 'pdf': 
        return { icon: <FileType size={20} />, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/20' };
      case 'doc': 
        return { icon: <FileText size={20} />, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' };
      case 'excel': 
        return { icon: <FileSpreadsheet size={20} />, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/20' };
      case 'link': 
        return { icon: <LinkIcon size={20} />, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-slate-800' };
      default: 
        return { icon: <File size={20} />, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-slate-800' };
    }
  };

  // Prepare Options for SearchableSelect
  const loaiTaiLieuOptions = masterData.loaiTaiLieu.map(i => ({ value: i.ten, label: i.ten }));
  const linhVucOptions = masterData.linhVuc.map(i => ({ value: i.ten, label: i.ten }));
  const boPhanOptions = masterData.boPhan.map(i => ({ value: i.ten, label: i.ten }));
  
  // --- UPDATED: Lọc nhân sự theo quyền hạn ---
  const mapUserToOption = (u: NhanSu) => ({
      value: u.ho_ten,
      label: u.ho_ten,
      subLabel: u.chuc_vu
  });

  // 1. Soạn thảo: Chỉ lấy User có role 'SOAN_THAO' hoặc 'QUAN_TRI'
  const drafterOptions = masterData.nhanSu
      .filter(u => u.roles.includes('SOAN_THAO') || u.roles.includes('QUAN_TRI'))
      .map(mapUserToOption);

  // 2. Xem xét: Chỉ lấy User có role 'XEM_XET' hoặc 'QUAN_TRI'
  const reviewerOptions = masterData.nhanSu
      .filter(u => u.roles.includes('XEM_XET') || u.roles.includes('QUAN_TRI'))
      .map(mapUserToOption);

  // 3. Phê duyệt: Chỉ lấy User có role 'PHE_DUYET' hoặc 'QUAN_TRI'
  const approverOptions = masterData.nhanSu
      .filter(u => u.roles.includes('PHE_DUYET') || u.roles.includes('QUAN_TRI'))
      .map(mapUserToOption);

  const inputClass = "w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 outline-none transition-all placeholder:text-gray-400 text-sm";
  const textareaClass = "w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 outline-none transition-all placeholder:text-gray-400 text-sm";
  const labelClass = "text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5 block";
  const sectionTitleClass = "text-base font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">
          {initialData ? 'Cập nhật tài liệu' : 'Thêm tài liệu mới'}
        </h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X size={20} />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {/* Nhóm 1: Thông tin định danh */}
        <div>
          <h3 className={sectionTitleClass}>
            <FileType size={18} className="text-blue-500" /> Thông tin chung
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
              <input
                required
                name="ten_tai_lieu"
                value={formData.ten_tai_lieu}
                onChange={handleChange}
                className={inputClass}
                placeholder="Nhập tên đầy đủ của tài liệu..."
              />
            </div>
            
             {/* Parent Document - Searchable - Đưa lên trước để kích hoạt logic mã */}
             <div className="space-y-2">
              <label className={labelClass}><span className="flex items-center gap-1"><GitBranch size={12}/> Thuộc tài liệu (Cha)</span></label>
              <SearchableSelect
                 options={availableParents}
                 value={formData.tai_lieu_cha_id}
                 onChange={(val) => handleSelectChange('tai_lieu_cha_id', val)}
                 placeholder="-- Không có (Tài liệu gốc) --"
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Loại tài liệu</label>
              <SearchableSelect
                 options={loaiTaiLieuOptions}
                 value={formData.loai_tai_lieu}
                 onChange={(val) => handleSelectChange('loai_tai_lieu', val)}
                 placeholder="-- Chọn loại --"
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Mã tài liệu <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                    required
                    name="ma_tai_lieu"
                    value={formData.ma_tai_lieu}
                    onChange={handleChange}
                    className={`${inputClass} pr-10 ${isCodeLocked ? 'bg-gray-100 dark:bg-slate-800 text-gray-500 cursor-not-allowed' : ''}`}
                    placeholder="VD: QT-NS-01"
                    readOnly={isCodeLocked}
                />
                <button 
                   type="button"
                   onClick={() => setIsCodeLocked(!isCodeLocked)}
                   className="absolute right-2 top-2 p-1 text-gray-400 hover:text-blue-500 transition-colors"
                   title={isCodeLocked ? "Mở khóa để sửa thủ công" : "Khóa để sinh mã tự động"}
                >
                    {isCodeLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
              </div>
              {isCodeLocked && formData.tai_lieu_cha_id && (
                  <p className="text-[10px] text-blue-500 flex items-center gap-1 mt-1">
                      <Hash size={10} /> Đang tự động sinh mã theo quy tắc cha-con
                  </p>
              )}
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Thứ tự sắp xếp</label>
              <input
                type="number"
                name="thu_tu"
                value={formData.thu_tu}
                onChange={handleChange}
                className={inputClass}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Lĩnh vực</label>
              <SearchableSelect
                 options={linhVucOptions}
                 value={formData.linh_vuc}
                 onChange={(val) => handleSelectChange('linh_vuc', val)}
                 placeholder="-- Chọn lĩnh vực --"
              />
            </div>

             <div className="space-y-2 md:col-span-2">
              <label className={labelClass}>Tiêu chuẩn áp dụng (Chọn nhiều)</label>
              <div className="flex flex-wrap gap-2">
                {masterData.tieuChuan.map(item => {
                  const isSelected = formData.tieu_chuan?.includes(item.ten);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleTieuChuan(item.ten)}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all
                        ${isSelected 
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                          : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'
                        }
                      `}
                    >
                      {isSelected ? <Check size={14} className="stroke-[3]" /> : <div className="w-3.5 h-3.5" />}
                      {item.ten}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Nhóm 2: Phiên bản & Thời gian */}
        <div>
          <h3 className={sectionTitleClass}>
            <Calendar size={18} className="text-green-500" /> Phiên bản & Thời gian
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className={labelClass}>Phiên bản (Ver)</label>
              <input
                name="phien_ban"
                value={formData.phien_ban}
                onChange={handleChange}
                className={inputClass}
                placeholder="VD: 1.0"
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Lần ban hành</label>
              <input
                type="number"
                min="0"
                name="lan_ban_hanh"
                value={formData.lan_ban_hanh}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Ngày ban hành</label>
              <input
                type="date"
                name="ngay_ban_hanh"
                value={formData.ngay_ban_hanh}
                onChange={handleChange}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Ngày hiệu lực</label>
              <input
                type="date"
                name="ngay_hieu_luc"
                value={formData.ngay_hieu_luc}
                onChange={handleChange}
                className={`${inputClass} dark:[color-scheme:dark]`}
              />
            </div>
            
            {/* New Design: Kiểm soát định kỳ */}
            <div className="col-span-1 md:col-span-4 mt-2">
               <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 text-blue-600 dark:text-blue-400">
                           <RefreshCw size={16} />
                        </div>
                        <div>
                           <h4 className="text-sm font-bold text-gray-800 dark:text-gray-100">Kiểm soát định kỳ</h4>
                           <p className="text-[11px] text-gray-500">Thiết lập thời gian nhắc nhở rà soát tài liệu</p>