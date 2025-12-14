
import React, { useState, useEffect } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { X, Save, Info, Calendar, UserCheck, FileType, Check, Paperclip, Trash2, Plus, Link as LinkIcon, FileText, FileSpreadsheet, File, RefreshCw, GitBranch, Clock, AlertCircle, Lock, Unlock, Hash, ExternalLink, Eye } from 'lucide-react';
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
    chu_ky_ra_soat: 0, // Default 0 (Disabled)
    ngay_ra_soat_tiep_theo: '',
    nguoi_soan_thao: '',
    nguoi_xem_xet: '',
    nguoi_phe_duyet: '',
    mo_ta_tom_tat: '',
    dinh_kem: [],
    trang_thai: TrangThaiTaiLieu.SOAN_THAO,
  });

  const [urlInput, setUrlInput] = useState('');
  const [isCodeLocked, setIsCodeLocked] = useState(false);
  const [isReviewEnabled, setIsReviewEnabled] = useState(false);
  const dialog = useDialog();

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
      } else {
          // Root logic (optional)
      }

      if (newCode && newCode !== formData.ma_tai_lieu) {
          setFormData(prev => ({ ...prev, ma_tai_lieu: newCode }));
      }

  }, [formData.tai_lieu_cha_id, formData.loai_tai_lieu, isCodeLocked, fullList, masterData.loaiTaiLieu, initialData]);


  useEffect(() => {
    // Only calculate if review is enabled and we have valid inputs
    if (isReviewEnabled && formData.ngay_hieu_luc && formData.chu_ky_ra_soat) {
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
  }, [formData.ngay_hieu_luc, formData.chu_ky_ra_soat, isReviewEnabled]);

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

  const toggleReview = () => {
      const newState = !isReviewEnabled;
      setIsReviewEnabled(newState);
      if (!newState) {
          // Turning OFF: Reset cycle
          setFormData(prev => ({ ...prev, chu_ky_ra_soat: 0, ngay_ra_soat_tiep_theo: '' }));
      } else {
          // Turning ON: Default to 12 months if not set
          setFormData(prev => ({ ...prev, chu_ky_ra_soat: prev.chu_ky_ra_soat || 12 }));
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

  const detectTypeFromUrl = (url: string): 'pdf' | 'doc' | 'excel' | 'link' => {
      const lower = url.toLowerCase();
      if (lower.includes('.pdf')) return 'pdf';
      if (lower.includes('.doc') || lower.includes('.docx')) return 'doc';
      if (lower.includes('.xls') || lower.includes('.xlsx') || lower.includes('.csv')) return 'excel';
      return 'link';
  };

  const handleAddFile = (selectedType: 'pdf' | 'doc' | 'excel' | 'link') => {
    if (!urlInput.trim()) {
      dialog.alert("Vui lòng dán đường dẫn (Link) vào ô trống trước khi chọn loại file!", { type: 'warning' });
      return;
    }
    
    // Auto-correct type based on extension if possible
    const detectedType = detectTypeFromUrl(urlInput);
    const finalType = detectedType !== 'link' ? detectedType : selectedType;

    const name = getFileNameFromUrl(urlInput);
    const file: DinhKem = {
      id: `file_${Date.now()}`,
      ten_file: name,
      url: urlInput,
      loai: finalType,
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
    if (!formData.ma_tai_lieu || !formData.ten_tai_lieu) {
        dialog.alert("Vui lòng nhập Mã và Tên tài liệu!", { type: 'warning' });
        return;
    }

    // Clean data before saving
    const cleanData = { ...formData };
    
    // Convert empty strings to null for DATE fields to prevent Supabase 400 error
    if (cleanData.ngay_ra_soat_tiep_theo === '') cleanData.ngay_ra_soat_tiep_theo = null as any;
    if (cleanData.ngay_ban_hanh === '') cleanData.ngay_ban_hanh = null as any;
    if (cleanData.ngay_hieu_luc === '') cleanData.ngay_hieu_luc = null as any;

    onSave(cleanData);
  };

  const getFileTypeConfig = (type: string) => {
    switch(type) {
      case 'pdf': 
        return { 
            icon: <FileType size={20} strokeWidth={1.5} />, 
            color: 'text-red-600 dark:text-red-400', 
            bg: 'bg-red-50 dark:bg-red-900/20',
            border: 'border-red-100 dark:border-red-900/30'
        };
      case 'doc': 
        return { 
            icon: <FileText size={20} strokeWidth={1.5} />, 
            color: 'text-blue-600 dark:text-blue-400', 
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            border: 'border-blue-100 dark:border-blue-900/30'
        };
      case 'excel': 
        return { 
            icon: <FileSpreadsheet size={20} strokeWidth={1.5} />, 
            color: 'text-emerald-600 dark:text-emerald-400', 
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-emerald-100 dark:border-emerald-900/30'
        };
      case 'link': 
        return { 
            icon: <LinkIcon size={20} strokeWidth={1.5} />, 
            color: 'text-indigo-600 dark:text-indigo-400', 
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
            border: 'border-indigo-100 dark:border-indigo-900/30'
        };
      default: 
        return { 
            icon: <File size={20} strokeWidth={1.5} />, 
            color: 'text-slate-600 dark:text-slate-400', 
            bg: 'bg-slate-100 dark:bg-slate-800',
            border: 'border-slate-200 dark:border-slate-700'
        };
    }
  };

  const loaiTaiLieuOptions = masterData.loaiTaiLieu.map(i => ({ value: i.ten, label: i.ten }));
  const linhVucOptions = masterData.linhVuc.map(i => ({ value: i.ten, label: i.ten }));
  
  // Update to use ID as value
  const mapUserToOption = (u: NhanSu) => ({
      value: u.id,
      label: u.ho_ten,
      subLabel: u.chuc_vu
  });

  const drafterOptions = masterData.nhanSu
      .filter(u => u.roles.includes('SOAN_THAO') || u.roles.includes('QUAN_TRI'))
      .map(mapUserToOption);

  const reviewerOptions = masterData.nhanSu
      .filter(u => u.roles.includes('XEM_XET') || u.roles.includes('QUAN_TRI'))
      .map(mapUserToOption);

  const approverOptions = masterData.nhanSu
      .filter(u => u.roles.includes('PHE_DUYET') || u.roles.includes('QUAN_TRI'))
      .map(mapUserToOption);

  const inputClass = "w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 outline-none transition-all placeholder:text-gray-400 text-sm";
  const textareaClass = "w-full p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40 outline-none transition-all placeholder:text-gray-400 text-sm";
  const labelClass = "text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1.5 block";
  const sectionTitleClass = "text-base font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950">
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-100 dark:border-slate-800">
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
            
            {/* New Design: Kiểm soát định kỳ (Có Toggle) */}
            <div className="col-span-1 md:col-span-4 mt-2">
               <div className={`rounded-xl border transition-colors ${isReviewEnabled ? 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 border-dashed'}`}>
                  <div className="p-4 flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${isReviewEnabled ? 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-blue-600 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 border-transparent text-gray-400'}`}>
                           <RefreshCw size={18} />
                        </div>
                        <div>
                           <h4 className={`text-sm font-bold ${isReviewEnabled ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500'}`}>Kiểm soát định kỳ</h4>
                           <p className="text-[11px] text-gray-500">Thiết lập thời gian nhắc nhở rà soát tài liệu</p>
                        </div>
                     </div>
                     
                     {/* Toggle Switch */}
                     <label className="relative inline-flex items-center cursor-pointer" title={isReviewEnabled ? "Tắt kiểm soát định kỳ" : "Bật kiểm soát định kỳ"}>
                        <input type="checkbox" className="sr-only peer" checked={isReviewEnabled} onChange={toggleReview} />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                     </label>
                  </div>

                  {isReviewEnabled && (
                      <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-slate-700">
                              <div>
                                  <label className={labelClass}>Chu kỳ rà soát (Tháng)</label>
                                  <div className="flex items-center gap-2">
                                      <input
                                          type="number"
                                          min="1"
                                          name="chu_ky_ra_soat"
                                          value={formData.chu_ky_ra_soat || ''}
                                          onChange={handleChange}
                                          className={inputClass}
                                      />
                                      <span className="text-sm text-gray-500 whitespace-nowrap">Tháng</span>
                                  </div>
                              </div>
                              <div>
                                  <label className={labelClass}>Ngày rà soát tiếp theo</label>
                                  <input
                                      type="date"
                                      name="ngay_ra_soat_tiep_theo"
                                      value={formData.ngay_ra_soat_tiep_theo || ''}
                                      onChange={handleChange}
                                      className={`${inputClass} dark:[color-scheme:dark]`}
                                  />
                              </div>
                          </div>
                      </div>
                  )}
               </div>
            </div>
          </div>
        </div>

        {/* Nhóm 3: Nội dung & Đính kèm */}
        <div>
          <h3 className={sectionTitleClass}>
            <Paperclip size={18} className="text-purple-500" /> Nội dung & Đính kèm
          </h3>
          <div className="space-y-6">
            <div className="space-y-2">
              <label className={labelClass}>Mô tả tóm tắt nội dung</label>
              <textarea
                name="mo_ta_tom_tat"
                value={formData.mo_ta_tom_tat}
                onChange={handleChange}
                className={`${textareaClass} min-h-[100px]`}
                placeholder="Tóm tắt phạm vi, mục đích của tài liệu..."
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Link tài liệu đính kèm (PDF/Word/Excel)</label>
              <div className="flex gap-2">
                <input
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className={inputClass}
                  placeholder="Dán đường dẫn (URL) tài liệu vào đây..."
                />
              </div>
              <div className="flex gap-2 mt-2">
                 <Button type="button" size="sm" variant="secondary" onClick={() => handleAddFile('pdf')}><FileType size={14} className="mr-1 text-red-600"/> PDF</Button>
                 <Button type="button" size="sm" variant="secondary" onClick={() => handleAddFile('doc')}><FileText size={14} className="mr-1 text-blue-600"/> Word</Button>
                 <Button type="button" size="sm" variant="secondary" onClick={() => handleAddFile('excel')}><FileSpreadsheet size={14} className="mr-1 text-green-600"/> Excel</Button>
                 <Button type="button" size="sm" variant="secondary" onClick={() => handleAddFile('link')}><LinkIcon size={14} className="mr-1"/> Link Khác</Button>
              </div>

              {formData.dinh_kem && formData.dinh_kem.length > 0 && (
                <div className="grid grid-cols-1 gap-3 mt-4">
                  {formData.dinh_kem.map(file => {
                    const config = getFileTypeConfig(file.loai);
                    return (
                      <div key={file.id} className="group flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-sm hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                           {config.icon}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                           <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate hover:text-blue-600 dark:hover:text-blue-400 block mb-0.5">
                              {file.ten_file}
                           </a>
                           <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="uppercase font-bold">{file.loai}</span>
                              <span>•</span>
                              <span>{format(new Date(file.ngay_upload), 'dd/MM/yyyy HH:mm')}</span>
                           </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                           <a 
                             href={file.url} 
                             target="_blank" 
                             rel="noreferrer"
                             className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                             title="Mở liên kết"
                           >
                             <ExternalLink size={18} />
                           </a>
                           <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                           <button 
                             type="button"
                             onClick={() => removeFile(file.id)}
                             className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                             title="Xóa file"
                           >
                             <Trash2 size={18} />
                           </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Nhóm 4: Trách nhiệm */}
        <div>
          <h3 className={sectionTitleClass}>
            <UserCheck size={18} className="text-orange-500" /> Trách nhiệm
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className={labelClass}>Người soạn thảo (Bộ phận sẽ tự động theo người soạn)</label>
              <SearchableSelect
                 options={drafterOptions}
                 value={formData.nguoi_soan_thao}
                 onChange={(val) => handleSelectChange('nguoi_soan_thao', val)}
                 placeholder="-- Chọn người soạn --"
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Người xem xét</label>
              <SearchableSelect
                 options={reviewerOptions}
                 value={formData.nguoi_xem_xet}
                 onChange={(val) => handleSelectChange('nguoi_xem_xet', val)}
                 placeholder="-- Chọn người xem xét --"
              />
            </div>

            <div className="space-y-2">
              <label className={labelClass}>Người phê duyệt</label>
              <SearchableSelect
                 options={approverOptions}
                 value={formData.nguoi_phe_duyet}
                 onChange={(val) => handleSelectChange('nguoi_phe_duyet', val)}
                 placeholder="-- Chọn người duyệt --"
              />
            </div>
          </div>
        </div>

      </form>

      <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 sticky bottom-0 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>Hủy bỏ</Button>
        <Button onClick={handleSubmit} leftIcon={<Save size={16} />}>Lưu thông tin</Button>
      </div>
    </div>
  );
};
