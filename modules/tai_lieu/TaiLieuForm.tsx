
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Save, Info, Calendar, UserCheck, FileType, Paperclip, Trash2, Link as LinkIcon, FileText, FileSpreadsheet, File, RefreshCw, Lock, Unlock, Layers, Tag, X, Hash, AlignLeft, Briefcase, Bookmark, FilePenLine, Plus } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { useDialog } from '../../contexts/DialogContext';

interface TaiLieuFormProps {
  initialData?: TaiLieu | null;
  onSave: (data: Partial<TaiLieu>) => void;
  onCancel: () => void;
  masterData: MasterDataState;
  fullList?: TaiLieu[];
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
    chu_ky_ra_soat: 0, 
    ngay_ra_soat_tiep_theo: '',
    id_nguoi_soan_thao: '',
    id_nguoi_xem_xet: '',
    id_nguoi_phe_duyet: '',
    mo_ta_tom_tat: '',
    dinh_kem: [],
    trang_thai: TrangThaiTaiLieu.SOAN_THAO,
  });

  const [urlInput, setUrlInput] = useState('');
  const [isCodeLocked, setIsCodeLocked] = useState(false);
  const [isReviewEnabled, setIsReviewEnabled] = useState(false);
  const dialog = useDialog();

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const availableParents = fullList.filter(d => d.id !== initialData?.id).map(d => ({
      value: d.id,
      label: d.ten_tai_lieu,
      subLabel: d.ma_tai_lieu
  }));

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsReviewEnabled(!!initialData.chu_ky_ra_soat && initialData.chu_ky_ra_soat > 0);
      setIsCodeLocked(false);
    } else {
        setIsCodeLocked(true);
        setIsReviewEnabled(false);
    }
  }, [initialData]);

  // Auto-generate Code Logic (Giữ nguyên logic cũ)
  useEffect(() => {
      if (initialData || !isCodeLocked) return;
      if (!formData.loai_tai_lieu) return;

      const docTypeConfig = masterData.loaiTaiLieu.find(t => t.ten === formData.loai_tai_lieu);
      if (!docTypeConfig) return;

      const prefix = docTypeConfig.ma_viet_tat || '';
      const separator = docTypeConfig.ky_tu_noi || '.';
      const digitCount = docTypeConfig.do_dai_so || 2;

      let newCode = '';

      if (formData.tai_lieu_cha_id) {
          const parentDoc = fullList.find(d => d.id === formData.tai_lieu_cha_id);
          if (parentDoc) {
             const siblings = fullList.filter(d => 
                d.tai_lieu_cha_id === parentDoc.id && 
                d.loai_tai_lieu === formData.loai_tai_lieu &&
                d.id !== initialData?.id 
             );
             const nextNum = siblings.length + 1;
             const paddedNum = String(nextNum).padStart(digitCount, '0');
             newCode = `${parentDoc.ma_tai_lieu}${separator}${prefix}${paddedNum}`;
          }
      } 
      // Root logic could be added here

      if (newCode && newCode !== formData.ma_tai_lieu) {
          setFormData(prev => ({ ...prev, ma_tai_lieu: newCode }));
      }
  }, [formData.tai_lieu_cha_id, formData.loai_tai_lieu, isCodeLocked, fullList, masterData.loaiTaiLieu, initialData]);

  // Review Date Logic
  useEffect(() => {
    if (isReviewEnabled && formData.ngay_hieu_luc && formData.chu_ky_ra_soat) {
        try {
            const hieuLucDate = new Date(formData.ngay_hieu_luc);
            const nextDate = addMonths(hieuLucDate, formData.chu_ky_ra_soat);
            const formattedNextDate = format(nextDate, 'yyyy-MM-dd');
            
            if (formattedNextDate !== formData.ngay_ra_soat_tiep_theo) {
                setFormData(prev => ({ ...prev, ngay_ra_soat_tiep_theo: formattedNextDate }));
            }
        } catch (e) { console.error(e); }
    }
  }, [formData.ngay_hieu_luc, formData.chu_ky_ra_soat, isReviewEnabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const finalValue = (name === 'chu_ky_ra_soat' || name === 'thu_tu' || name === 'lan_ban_hanh') 
        ? (value === '' ? 0 : parseInt(value)) : value;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSelectChange = (key: keyof TaiLieu, value: any) => {
      setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleTieuChuan = (tieuChuanName: string) => {
    const currentList = formData.tieu_chuan || [];
    if (currentList.includes(tieuChuanName)) {
      setFormData(prev => ({ ...prev, tieu_chuan: currentList.filter(item => item !== tieuChuanName) }));
    } else {
      setFormData(prev => ({ ...prev, tieu_chuan: [...currentList, tieuChuanName] }));
    }
  };

  const getFileNameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.split('/').pop() || urlObj.hostname;
    } catch (e) { return "File đính kèm"; }
  };

  const handleAddFile = (selectedType: 'pdf' | 'doc' | 'excel' | 'link') => {
    if (!urlInput.trim()) {
      dialog.alert("Vui lòng dán đường dẫn (Link) vào ô trống!", { type: 'warning' });
      return;
    }
    const file: DinhKem = {
      id: `file_${Date.now()}`,
      ten_file: getFileNameFromUrl(urlInput),
      url: urlInput,
      loai: selectedType,
      ngay_upload: new Date().toISOString()
    };
    setFormData(prev => ({ ...prev, dinh_kem: [...(prev.dinh_kem || []), file] }));
    setUrlInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ma_tai_lieu || !formData.ten_tai_lieu) {
        dialog.alert("Vui lòng nhập Mã và Tên tài liệu!", { type: 'warning' });
        return;
    }
    onSave(formData);
  };

  // --- STYLING CONSTANTS (Login Style) ---
  const inputContainerClass = "relative group";
  const iconClass = "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors";
  const inputClass = "w-full h-11 pl-10 pr-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm";
  const labelClass = "block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase ml-1 mb-1.5";

  const loaiTaiLieuOptions = masterData.loaiTaiLieu.map(i => ({ value: i.ten, label: i.ten }));
  const linhVucOptions = masterData.linhVuc.map(i => ({ value: i.ten, label: i.ten }));
  
  const mapUserToOption = (u: NhanSu) => ({ value: u.id, label: u.ho_ten, subLabel: u.chuc_vu });
  const drafterOptions = masterData.nhanSu.filter(u => u.roles.includes('SOAN_THAO') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);
  const reviewerOptions = masterData.nhanSu.filter(u => u.roles.includes('XEM_XET') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);
  const approverOptions = masterData.nhanSu.filter(u => u.roles.includes('PHE_DUYET') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 overflow-y-auto bg-gray-100/80 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* Background decoration similar to Login */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute top-[5%] right-[10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-[5%] left-[10%] w-[30%] h-[30%] bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 flex flex-col max-h-[95vh] z-10 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 pb-4 border-b border-gray-100 dark:border-slate-800 text-center relative shrink-0">
            <button onClick={onCancel} className="absolute right-6 top-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-red-500 transition-colors">
                <X size={24} />
            </button>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg shadow-blue-500/30">
                <FilePenLine size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {initialData ? 'Cập nhật tài liệu' : 'Soạn thảo tài liệu mới'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {initialData ? `Chỉnh sửa thông tin cho ${initialData.ma_tai_lieu}` : 'Điền thông tin chi tiết để khởi tạo tài liệu'}
            </p>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
            <form onSubmit={handleSubmit} className="space-y-8">
                
                {/* SECTION 1: ĐỊNH DANH */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">1. Thông tin định danh</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputContainerClass}>
                            <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <div className={iconClass}><FileText size={18}/></div>
                                <input required name="ten_tai_lieu" value={formData.ten_tai_lieu} onChange={handleChange} className={inputClass} placeholder="Nhập tên tài liệu..." />
                            </div>
                        </div>
                        
                        <div className={inputContainerClass}>
                            <label className={labelClass}>Mã tài liệu <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <div className={iconClass}><Hash size={18}/></div>
                                <input required name="ma_tai_lieu" value={formData.ma_tai_lieu} onChange={handleChange} className={`${inputClass} font-mono font-bold text-blue-600`} placeholder="Mã tự động..." readOnly={isCodeLocked} />
                                <button type="button" onClick={() => setIsCodeLocked(!isCodeLocked)} className="absolute right-3 top-2.5 text-gray-400 hover:text-blue-500" title="Khóa/Mở khóa mã">
                                    {isCodeLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                             <label className={labelClass}>Mô tả tóm tắt</label>
                             <div className="relative group">
                                <div className={`${iconClass} items-start pt-3`}><AlignLeft size={18}/></div>
                                <textarea name="mo_ta_tom_tat" value={formData.mo_ta_tom_tat} onChange={handleChange} className={`${inputClass} h-auto min-h-[80px] py-3`} placeholder="Mô tả phạm vi, mục đích..." />
                             </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: PHÂN LOẠI */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">2. Phân loại & Tiêu chuẩn</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={inputContainerClass}>
                            <label className={labelClass}>Loại tài liệu</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-10"><Layers size={18}/></div>
                                <div className="[&>div]:pl-8"><SearchableSelect options={loaiTaiLieuOptions} value={formData.loai_tai_lieu} onChange={(val) => handleSelectChange('loai_tai_lieu', val)} placeholder="Chọn loại..." className="h-11" /></div>
                            </div>
                        </div>
                        <div className={inputContainerClass}>
                            <label className={labelClass}>Lĩnh vực</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 z-10"><Briefcase size={18}/></div>
                                <div className="[&>div]:pl-8"><SearchableSelect options={linhVucOptions} value={formData.linh_vuc} onChange={(val) => handleSelectChange('linh_vuc', val)} placeholder="Chọn lĩnh vực..." className="h-11"/></div>
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClass}>Tiêu chuẩn áp dụng</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {masterData.tieuChuan.map(item => {
                                    const isSelected = formData.tieu_chuan?.includes(item.ten);
                                    return (
                                        <button key={item.id} type="button" onClick={() => toggleTieuChuan(item.ten)} className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-blue-400'}`}>
                                            <Tag size={14} /> {item.ten}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 3: TRÁCH NHIỆM */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">3. Trách nhiệm thực hiện</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className={labelClass}>Người soạn thảo</label>
                            <SearchableSelect options={drafterOptions} value={formData.id_nguoi_soan_thao} onChange={(val) => handleSelectChange('id_nguoi_soan_thao', val)} placeholder="Chọn..." className="h-11"/>
                        </div>
                        <div>
                            <label className={labelClass}>Người xem xét</label>
                            <SearchableSelect options={reviewerOptions} value={formData.id_nguoi_xem_xet} onChange={(val) => handleSelectChange('id_nguoi_xem_xet', val)} placeholder="Chọn..." className="h-11"/>
                        </div>
                        <div>
                            <label className={labelClass}>Người phê duyệt</label>
                            <SearchableSelect options={approverOptions} value={formData.id_nguoi_phe_duyet} onChange={(val) => handleSelectChange('id_nguoi_phe_duyet', val)} placeholder="Chọn..." className="h-11"/>
                        </div>
                    </div>
                </div>

                {/* SECTION 4: HIỆU LỰC */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">4. Kiểm soát & Hiệu lực</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className={inputContainerClass}>
                            <label className={labelClass}>Phiên bản</label>
                            <div className="relative">
                                <div className={iconClass}><Bookmark size={18}/></div>
                                <input name="phien_ban" value={formData.phien_ban} onChange={handleChange} className={inputClass} />
                            </div>
                        </div>
                        <div className={inputContainerClass}>
                            <label className={labelClass}>Ngày hiệu lực</label>
                            <div className="relative">
                                <div className={iconClass}><Calendar size={18}/></div>
                                <input type="date" name="ngay_hieu_luc" value={formData.ngay_hieu_luc} onChange={handleChange} className={`${inputClass} pr-2`} />
                            </div>
                        </div>
                        <div className="col-span-2 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
                             <div className="flex items-center gap-3">
                                 <input type="checkbox" className="w-5 h-5 accent-blue-600 rounded" checked={isReviewEnabled} onChange={() => setIsReviewEnabled(!isReviewEnabled)}/>
                                 <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Định kỳ rà soát</span>
                             </div>
                             {isReviewEnabled && (
                                 <div className="mt-3 flex items-center gap-2 animate-in slide-in-from-top-1">
                                     <input type="number" min="1" name="chu_ky_ra_soat" value={formData.chu_ky_ra_soat || ''} onChange={handleChange} className="w-20 h-9 rounded-lg border border-gray-300 px-2 text-center text-sm" placeholder="Tháng"/>
                                     <span className="text-xs text-gray-500">tháng / lần</span>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* SECTION 5: ĐÍNH KÈM */}
                <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 border-b border-gray-100 dark:border-slate-800 pb-2">5. Tài liệu đính kèm</h3>
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1 group">
                            <div className={iconClass}><LinkIcon size={18}/></div>
                            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={inputClass} placeholder="Dán link tài liệu vào đây (Google Drive/SharePoint)..." />
                        </div>
                        <Button type="button" onClick={() => handleAddFile('link')} variant="secondary" className="h-11 w-11 p-0 rounded-xl flex items-center justify-center"><Plus size={20}/></Button>
                    </div>
                    <div className="space-y-2">
                        {formData.dinh_kem?.map(file => (
                            <div key={file.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm text-blue-600"><FileText size={20}/></div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{file.ten_file}</p>
                                    <p className="text-xs text-gray-400 truncate">{file.url}</p>
                                </div>
                                <button type="button" onClick={() => setFormData(prev => ({...prev, dinh_kem: prev.dinh_kem?.filter(f => f.id !== file.id)}))} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                            </div>
                        ))}
                        {(!formData.dinh_kem || formData.dinh_kem.length === 0) && (
                            <p className="text-center text-sm text-gray-400 italic py-4">Chưa có file đính kèm.</p>
                        )}
                    </div>
                </div>

            </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-3xl flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={onCancel} className="h-12 px-8 rounded-xl text-gray-500 hover:bg-gray-100">Hủy bỏ</Button>
            <Button onClick={handleSubmit} className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 font-bold text-base" leftIcon={<Save size={20}/>}>Lưu tài liệu</Button>
        </div>

      </div>
    </div>,
    document.body
  );
};
