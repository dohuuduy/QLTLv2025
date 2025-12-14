
import React, { useState, useEffect } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { X, Save, Info, Calendar, UserCheck, FileType, Check, Paperclip, Trash2, Plus, Link as LinkIcon, FileText, FileSpreadsheet, File, RefreshCw, GitBranch, Clock, AlertCircle, Lock, Unlock, Hash, ExternalLink, Eye, Layers, Tag, Bookmark } from 'lucide-react';
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
          setFormData(prev => ({ ...prev, chu_ky_ra_soat: 0, ngay_ra_soat_tiep_theo: '' }));
      } else {
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
    const cleanData = { ...formData };
    if (cleanData.ngay_ra_soat_tiep_theo === '') cleanData.ngay_ra_soat_tiep_theo = null as any;
    if (cleanData.ngay_ban_hanh === '') cleanData.ngay_ban_hanh = null as any;
    if (cleanData.ngay_hieu_luc === '') cleanData.ngay_hieu_luc = null as any;
    onSave(cleanData);
  };

  const getFileTypeConfig = (type: string) => {
    switch(type) {
      case 'pdf': return { icon: <FileType size={20} strokeWidth={1.5} />, color: 'text-red-600', bg: 'bg-red-50' };
      case 'doc': return { icon: <FileText size={20} strokeWidth={1.5} />, color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'excel': return { icon: <FileSpreadsheet size={20} strokeWidth={1.5} />, color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'link': return { icon: <LinkIcon size={20} strokeWidth={1.5} />, color: 'text-indigo-600', bg: 'bg-indigo-50' };
      default: return { icon: <File size={20} strokeWidth={1.5} />, color: 'text-slate-600', bg: 'bg-slate-100' };
    }
  };

  const loaiTaiLieuOptions = masterData.loaiTaiLieu.map(i => ({ value: i.ten, label: i.ten }));
  const linhVucOptions = masterData.linhVuc.map(i => ({ value: i.ten, label: i.ten }));
  
  const mapUserToOption = (u: NhanSu) => ({ value: u.id, label: u.ho_ten, subLabel: u.chuc_vu });
  const drafterOptions = masterData.nhanSu.filter(u => u.roles.includes('SOAN_THAO') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);
  const reviewerOptions = masterData.nhanSu.filter(u => u.roles.includes('XEM_XET') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);
  const approverOptions = masterData.nhanSu.filter(u => u.roles.includes('PHE_DUYET') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);

  const inputClass = "w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400 text-sm";
  const textareaClass = "w-full p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-gray-400 text-sm";
  const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block";
  
  // Section Wrapper
  const Section = ({ title, icon: Icon, children, className = "" }: any) => (
      <div className={`bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm ${className}`}>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2 border-b border-gray-50 dark:border-slate-800/50 pb-2">
              <Icon size={16} className="text-blue-500" /> {title}
          </h3>
          {children}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
        <div className="flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-md" title={initialData ? initialData.ten_tai_lieu : 'Tạo mới'}>
            {initialData ? initialData.ten_tai_lieu : 'Soạn thảo tài liệu mới'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{initialData ? 'Cập nhật thông tin' : 'Điền thông tin bên dưới'}</span>
                {initialData && <span className="bg-blue-100 text-blue-700 px-1.5 rounded font-mono">v{initialData.phien_ban}</span>}
            </div>
        </div>
        <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>Hủy bỏ</Button>
            <Button onClick={handleSubmit} leftIcon={<Save size={16} />}>Lưu lại</Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
            
            {/* --- LEFT COLUMN: MAIN CONTENT (66%) --- */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 1. Basic Info */}
                <Section title="Thông tin định danh" icon={FileText}>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
                            <input required name="ten_tai_lieu" value={formData.ten_tai_lieu} onChange={handleChange} className={inputClass} placeholder="VD: Quy trình kiểm soát chất lượng..." autoFocus />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Mã tài liệu <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <input required name="ma_tai_lieu" value={formData.ma_tai_lieu} onChange={handleChange} className={`${inputClass} pr-9 font-mono font-bold text-blue-700 dark:text-blue-400 ${isCodeLocked ? 'bg-gray-50 dark:bg-slate-800 text-gray-500 cursor-not-allowed' : ''}`} placeholder="Auto-gen or Type..." readOnly={isCodeLocked} />
                                    <button type="button" onClick={() => setIsCodeLocked(!isCodeLocked)} className="absolute right-2 top-2 text-gray-400 hover:text-blue-500 transition-colors" title={isCodeLocked ? "Mở khóa sửa thủ công" : "Khóa để sinh mã tự động"}>
                                        {isCodeLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Tài liệu cha (Nếu có)</label>
                                <SearchableSelect options={availableParents} value={formData.tai_lieu_cha_id} onChange={(val) => handleSelectChange('tai_lieu_cha_id', val)} placeholder="-- Chọn tài liệu gốc --" />
                            </div>
                        </div>
                        <div>
                            <label className={labelClass}>Mô tả tóm tắt</label>
                            <textarea name="mo_ta_tom_tat" value={formData.mo_ta_tom_tat} onChange={handleChange} className={`${textareaClass} min-h-[120px]`} placeholder="Mô tả phạm vi áp dụng, mục đích của tài liệu..." />
                        </div>
                    </div>
                </Section>

                {/* 2. Attachments */}
                <Section title="Nội dung & Đính kèm" icon={Paperclip}>
                    <div className="space-y-4">
                        <div className="flex gap-2">
                            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={inputClass} placeholder="Dán đường dẫn (Google Drive, SharePoint...) vào đây" />
                            <div className="flex gap-1 shrink-0">
                                <Button type="button" size="sm" variant="secondary" onClick={() => handleAddFile('pdf')}><FileType size={14} className="text-red-600"/> PDF</Button>
                                <Button type="button" size="sm" variant="secondary" onClick={() => handleAddFile('doc')}><FileText size={14} className="text-blue-600"/> Word</Button>
                                <Button type="button" size="sm" variant="secondary" onClick={() => handleAddFile('excel')}><FileSpreadsheet size={14} className="text-green-600"/> Excel</Button>
                            </div>
                        </div>

                        {formData.dinh_kem && formData.dinh_kem.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2">
                                {formData.dinh_kem.map(file => {
                                    const config = getFileTypeConfig(file.loai);
                                    return (
                                        <div key={file.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 group hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>{config.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate hover:text-blue-600 block">{file.ten_file}</a>
                                                <div className="text-[10px] text-gray-400">{format(new Date(file.ngay_upload), 'dd/MM/yyyy HH:mm')}</div>
                                            </div>
                                            <button type="button" onClick={() => removeFile(file.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg text-gray-400 text-sm">Chưa có file đính kèm</div>
                        )}
                    </div>
                </Section>
            </div>

            {/* --- RIGHT COLUMN: META DATA (33%) --- */}
            <div className="space-y-6">
                
                {/* 3. Classification */}
                <Section title="Phân loại" icon={Layers}>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Loại tài liệu</label>
                            <SearchableSelect options={loaiTaiLieuOptions} value={formData.loai_tai_lieu} onChange={(val) => handleSelectChange('loai_tai_lieu', val)} placeholder="-- Chọn loại --" />
                        </div>
                        <div>
                            <label className={labelClass}>Lĩnh vực hoạt động</label>
                            <SearchableSelect options={linhVucOptions} value={formData.linh_vuc} onChange={(val) => handleSelectChange('linh_vuc', val)} placeholder="-- Chọn lĩnh vực --" />
                        </div>
                        <div>
                            <label className={labelClass}>Tiêu chuẩn ISO (Tag)</label>
                            <div className="flex flex-wrap gap-2">
                                {masterData.tieuChuan.map(item => {
                                    const isSelected = formData.tieu_chuan?.includes(item.ten);
                                    return (
                                        <button key={item.id} type="button" onClick={() => toggleTieuChuan(item.ten)} className={`px-2 py-1 rounded text-xs border transition-all ${isSelected ? 'bg-blue-100 text-blue-700 border-blue-200 font-bold' : 'bg-white dark:bg-slate-800 text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                            {item.ten}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* 4. Control Info */}
                <Section title="Kiểm soát & Hiệu lực" icon={Calendar}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelClass}>Phiên bản</label><input name="phien_ban" value={formData.phien_ban} onChange={handleChange} className={inputClass} placeholder="1.0" /></div>
                            <div><label className={labelClass}>Lần ban hành</label><input type="number" min="0" name="lan_ban_hanh" value={formData.lan_ban_hanh} onChange={handleChange} className={inputClass} /></div>
                        </div>
                        <div><label className={labelClass}>Ngày ban hành</label><input type="date" name="ngay_ban_hanh" value={formData.ngay_ban_hanh} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark]`} /></div>
                        <div><label className={labelClass}>Ngày hiệu lực</label><input type="date" name="ngay_hieu_luc" value={formData.ngay_hieu_luc} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark]`} /></div>
                        
                        <div className={`p-3 rounded-lg border transition-colors ${isReviewEnabled ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-gray-50 dark:bg-slate-800 border-transparent'}`}>
                            <label className="flex items-center justify-between cursor-pointer mb-2">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><RefreshCw size={14}/> Định kỳ rà soát</span>
                                <input type="checkbox" className="accent-blue-600 w-4 h-4" checked={isReviewEnabled} onChange={toggleReview} />
                            </label>
                            {isReviewEnabled && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2"><input type="number" min="1" name="chu_ky_ra_soat" value={formData.chu_ky_ra_soat || ''} onChange={handleChange} className={inputClass} /><span className="text-xs text-gray-500 whitespace-nowrap">Tháng / lần</span></div>
                                    <div><label className="text-[10px] text-gray-400 uppercase block mb-1">Dự kiến rà soát</label><input type="date" name="ngay_ra_soat_tiep_theo" value={formData.ngay_ra_soat_tiep_theo || ''} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark]`} /></div>
                                </div>
                            )}
                        </div>
                    </div>
                </Section>

                {/* 5. Responsibility */}
                <Section title="Trách nhiệm" icon={UserCheck}>
                    <div className="space-y-4">
                        <div><label className={labelClass}>Người soạn thảo</label><SearchableSelect options={drafterOptions} value={formData.id_nguoi_soan_thao} onChange={(val) => handleSelectChange('id_nguoi_soan_thao', val)} placeholder="-- Chọn nhân sự --" /></div>
                        <div><label className={labelClass}>Người xem xét</label><SearchableSelect options={reviewerOptions} value={formData.id_nguoi_xem_xet} onChange={(val) => handleSelectChange('id_nguoi_xem_xet', val)} placeholder="-- Chọn nhân sự --" /></div>
                        <div><label className={labelClass}>Người phê duyệt</label><SearchableSelect options={approverOptions} value={formData.id_nguoi_phe_duyet} onChange={(val) => handleSelectChange('id_nguoi_phe_duyet', val)} placeholder="-- Chọn nhân sự --" /></div>
                    </div>
                </Section>

            </div>
        </div>
      </form>
    </div>
  );
};
