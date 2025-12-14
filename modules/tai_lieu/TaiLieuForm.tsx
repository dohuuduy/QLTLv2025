
import React, { useState, useEffect } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Info, Calendar, UserCheck, FileType, Paperclip, Trash2, Link as LinkIcon, FileText, FileSpreadsheet, File, RefreshCw, Lock, Unlock, Layers, Tag, UploadCloud, AlertCircle, Save, PenTool, Search as SearchIcon, FileSignature, GitCommit, ArrowRight } from 'lucide-react';
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

  // Auto-generate code logic
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
          // Root level logic could be added here if needed
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

    setFormData(prev => {
        const newData = { ...prev, [name]: finalValue };
        
        // Logic: Khi chọn Ngày ban hành -> Tự động điền Ngày hiệu lực (nếu chưa có hoặc muốn sync)
        if (name === 'ngay_ban_hanh') {
            newData.ngay_hieu_luc = value; 
        }
        
        return newData;
    });
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

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  // Styles
  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-slate-800";
  const textareaClass = "w-full p-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 outline-none transition-all text-sm resize-none";
  const labelClass = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block flex items-center gap-1";
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 p-2">
      <form id="document-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* --- LEFT COLUMN: MAIN CONTENT (9 cols) --- */}
            <div className="lg:col-span-9 space-y-6">
                
                {/* 1. Thông tin chung & Nội dung */}
                <div className="bg-white dark:bg-slate-900 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">
                        <Info size={16} className="text-blue-500"/> Thông tin & Nội dung
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        
                        <div className="md:col-span-2">
                            <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
                            <input required name="ten_tai_lieu" value={formData.ten_tai_lieu} onChange={handleChange} className={`${inputClass} font-medium`} placeholder="VD: Quy trình kiểm soát chất lượng đầu vào" autoFocus />
                        </div>

                        {/* Mã & Tài liệu cha */}
                        <div>
                            <label className={labelClass}>Mã tài liệu <span className="text-red-500">*</span></label>
                            <div className="relative group">
                                <input 
                                    required 
                                    name="ma_tai_lieu" 
                                    value={formData.ma_tai_lieu} 
                                    onChange={handleChange} 
                                    className={`${inputClass} pr-10 font-mono font-bold text-blue-700 dark:text-blue-400 ${isCodeLocked ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : ''}`} 
                                    placeholder="Tự động sinh mã..." 
                                    readOnly={isCodeLocked} 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setIsCodeLocked(!isCodeLocked)} 
                                    className="absolute right-3 top-2.5 text-gray-400 hover:text-blue-500 transition-colors"
                                    title={isCodeLocked ? "Mở khóa để sửa thủ công" : "Khóa để sinh mã tự động"}
                                >
                                    {isCodeLocked ? <Lock size={16} /> : <Unlock size={16} />}
                                </button>
                            </div>
                            {isCodeLocked && <p className="text-[10px] text-gray-400 mt-1 pl-1">Mã được sinh tự động theo quy tắc.</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Tài liệu gốc (Parent)</label>
                            <SearchableSelect options={availableParents} value={formData.tai_lieu_cha_id} onChange={(val) => handleSelectChange('tai_lieu_cha_id', val)} placeholder="-- Chọn tài liệu cha (nếu có) --" />
                        </div>

                        {/* Loại & Lĩnh vực */}
                        <div>
                            <label className={labelClass}>Loại tài liệu</label>
                            <SearchableSelect options={loaiTaiLieuOptions} value={formData.loai_tai_lieu} onChange={(val) => handleSelectChange('loai_tai_lieu', val)} placeholder="-- Chọn loại --" />
                        </div>
                        <div>
                            <label className={labelClass}>Lĩnh vực hoạt động</label>
                            <SearchableSelect options={linhVucOptions} value={formData.linh_vuc} onChange={(val) => handleSelectChange('linh_vuc', val)} placeholder="-- Chọn lĩnh vực --" />
                        </div>

                        {/* Standards */}
                        <div className="md:col-span-2">
                            <label className={labelClass}><Tag size={12} className="mr-1"/> Tiêu chuẩn áp dụng</label>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {masterData.tieuChuan.map(item => {
                                    const isSelected = formData.tieu_chuan?.includes(item.ten);
                                    return (
                                        <button key={item.id} type="button" onClick={() => toggleTieuChuan(item.ten)} className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5 ${isSelected ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-slate-700 hover:border-gray-300'}`}>
                                            {isSelected && <Tag size={10} className="fill-current" />} {item.ten}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Summary Description */}
                        <div className="md:col-span-2">
                            <label className={labelClass}>Mô tả tóm tắt nội dung</label>
                            <textarea name="mo_ta_tom_tat" value={formData.mo_ta_tom_tat} onChange={handleChange} className={`${textareaClass} min-h-[100px]`} placeholder="Mô tả phạm vi áp dụng, mục đích của tài liệu..." />
                        </div>
                    </div>
                </div>

                {/* 2. QUY TRÌNH XỬ LÝ (RESPONSIBILITY) - Moved to Bottom of Main Col for better alignment */}
                <div className="border-t border-gray-100 dark:border-slate-800 pt-6">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-4">
                        <GitCommit size={16} className="text-purple-500"/> Quy trình xử lý & Trách nhiệm
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                        {/* Horizontal Line for Desktop */}
                        <div className="hidden md:block absolute top-10 left-1/6 right-1/6 h-0.5 bg-gray-200 dark:bg-slate-700 z-0 transform translate-y-0.5 pointer-events-none"></div>

                        {/* Step 1: Draft */}
                        <div className="relative z-10 flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm shrink-0">
                                    <PenTool size={14} />
                                </div>
                                <span className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Bước 1: Soạn thảo</span>
                            </div>
                            <SearchableSelect options={drafterOptions} value={formData.id_nguoi_soan_thao} onChange={(val) => handleSelectChange('id_nguoi_soan_thao', val)} placeholder="Người soạn thảo..." className="w-full" />
                        </div>

                        {/* Step 2: Review */}
                        <div className="relative z-10 flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm shrink-0">
                                    <SearchIcon size={14} />
                                </div>
                                <span className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Bước 2: Xem xét</span>
                            </div>
                            <SearchableSelect options={reviewerOptions} value={formData.id_nguoi_xem_xet} onChange={(val) => handleSelectChange('id_nguoi_xem_xet', val)} placeholder="Người xem xét..." className="w-full" />
                        </div>

                        {/* Step 3: Approve */}
                        <div className="relative z-10 flex flex-col gap-2">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center border-4 border-white dark:border-slate-900 shadow-sm shrink-0">
                                    <FileSignature size={14} />
                                </div>
                                <span className="text-xs font-bold uppercase text-gray-600 dark:text-gray-400">Bước 3: Phê duyệt</span>
                            </div>
                            <SearchableSelect options={approverOptions} value={formData.id_nguoi_phe_duyet} onChange={(val) => handleSelectChange('id_nguoi_phe_duyet', val)} placeholder="Người phê duyệt..." className="w-full" />
                        </div>
                    </div>
                </div>
            </div>

            {/* --- RIGHT COLUMN: METADATA & CONTROL & ATTACHMENTS (3 cols) --- */}
            <div className="lg:col-span-3 space-y-6">
                
                {/* Control & Validity */}
                <div className="bg-white dark:bg-slate-900 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2 mb-4"><Calendar size={16} className="text-green-500"/> Kiểm soát</h4>
                    
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelClass}>Phiên bản</label>
                                <input name="phien_ban" value={formData.phien_ban} onChange={handleChange} className={`${inputClass} text-center font-mono`} placeholder="1.0" />
                            </div>
                            <div>
                                <label className={labelClass}>Lần BH</label>
                                <input type="number" min="0" name="lan_ban_hanh" value={formData.lan_ban_hanh} onChange={handleChange} className={`${inputClass} text-center font-mono`} />
                            </div>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Ngày ban hành</label>
                            <input type="date" name="ngay_ban_hanh" value={formData.ngay_ban_hanh} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark]`} />
                        </div>
                        <div>
                            <label className={labelClass}>Ngày hiệu lực</label>
                            <input type="date" name="ngay_hieu_luc" value={formData.ngay_hieu_luc} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark]`} />
                        </div>
                        
                        <div className={`p-3 rounded-xl border transition-all ${isReviewEnabled ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800' : 'bg-gray-50 dark:bg-slate-800 border-transparent'}`}>
                            <label className="flex items-center justify-between cursor-pointer mb-3">
                                <span className={`text-xs font-bold flex items-center gap-2 ${isReviewEnabled ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}><RefreshCw size={14}/> Rà soát định kỳ</span>
                                <div className={`w-8 h-4 rounded-full relative transition-colors ${isReviewEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                    <input type="checkbox" className="hidden" checked={isReviewEnabled} onChange={toggleReview} />
                                    <div className={`w-2.5 h-2.5 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${isReviewEnabled ? 'left-5' : 'left-0.5'}`}></div>
                                </div>
                            </label>
                            {isReviewEnabled && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2">
                                        <input type="number" min="1" name="chu_ky_ra_soat" value={formData.chu_ky_ra_soat || ''} onChange={handleChange} className="w-full h-8 px-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-orange-500/20 outline-none text-xs" placeholder="Số tháng" />
                                        <span className="text-[10px] text-orange-600 dark:text-orange-400 whitespace-nowrap font-medium uppercase">Tháng/lần</span>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-orange-600 dark:text-orange-400 uppercase font-bold block mb-1">Ngày rà soát tiếp theo</label>
                                        <input type="date" name="ngay_ra_soat_tiep_theo" value={formData.ngay_ra_soat_tiep_theo || ''} onChange={handleChange} className="w-full h-8 px-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-white dark:bg-slate-900 outline-none text-xs dark:[color-scheme:dark]" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Attachments moved to Right Col */}
                <div className="bg-white dark:bg-slate-900 rounded-xl">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2 mb-4">
                        <Paperclip size={16} className="text-orange-500"/> File đính kèm
                    </h4>
                    <div className="space-y-3">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-700 p-3 transition-colors hover:border-blue-400 group">
                            <div className="w-full relative mb-2">
                                <LinkIcon size={14} className="absolute left-2.5 top-2.5 text-gray-400"/>
                                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={`${inputClass} pl-8 text-xs h-8 bg-white dark:bg-slate-950`} placeholder="Dán link Drive/SharePoint..." />
                            </div>
                            <div className="flex gap-2 justify-between">
                                <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('pdf')} className="flex-1 h-7 text-[10px] px-1 hover:text-red-600 hover:border-red-200 bg-white dark:bg-slate-900"><FileType size={12} className="mr-1"/> PDF</Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('doc')} className="flex-1 h-7 text-[10px] px-1 hover:text-blue-600 hover:border-blue-200 bg-white dark:bg-slate-900"><FileText size={12} className="mr-1"/> Word</Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('excel')} className="flex-1 h-7 text-[10px] px-1 hover:text-emerald-600 hover:border-emerald-200 bg-white dark:bg-slate-900"><FileSpreadsheet size={12} className="mr-1"/> Excel</Button>
                            </div>
                        </div>

                        {formData.dinh_kem && formData.dinh_kem.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                                {formData.dinh_kem.map(file => {
                                    const config = getFileTypeConfig(file.loai);
                                    return (
                                        <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm group hover:border-blue-300 transition-all">
                                            <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>{React.cloneElement(config.icon as React.ReactElement<any>, { size: 16 })}</div>
                                            <div className="flex-1 min-w-0">
                                                <a href={file.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate hover:text-blue-600 block">{file.ten_file}</a>
                                            </div>
                                            <button type="button" onClick={() => removeFile(file.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
        {/* Hidden button to trigger submit via form element if needed */}
        <button type="submit" className="hidden"></button>
      </form>
      
      {/* Footer Buttons moved to Modal parent in TaiLieuList, but can add extra content here if needed */}
      <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button variant="secondary" onClick={onCancel}>Hủy bỏ</Button>
            <Button onClick={() => handleSubmit()} leftIcon={<Save size={16} />} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">Lưu dữ liệu</Button>
      </div>
    </div>
  );
};
