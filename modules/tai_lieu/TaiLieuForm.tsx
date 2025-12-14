
import React, { useState, useEffect } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Info, Calendar, UserCheck, FileType, Paperclip, Trash2, Link as LinkIcon, FileText, FileSpreadsheet, File, RefreshCw, Lock, Unlock, Layers, Tag, UploadCloud, AlertCircle, Save, PenTool, Search as SearchIcon, FileSignature, GitCommit } from 'lucide-react';
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
            
            {/* Left Column (Main Content) - 8 cols */}
            <div className="lg:col-span-8 space-y-6">
                
                {/* SECTION 1: IDENTITY & CLASSIFICATION */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                        <Info size={16} className="text-blue-500"/> Thông tin chung
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        
                        <div className="md:col-span-2">
                            <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
                            <input required name="ten_tai_lieu" value={formData.ten_tai_lieu} onChange={handleChange} className={`${inputClass} font-medium`} placeholder="VD: Quy trình kiểm soát chất lượng đầu vào" autoFocus />
                        </div>

                        {/* Row: Code & Parent */}
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
                            {isCodeLocked && <p className="text-[10px] text-gray-400 mt-1 pl-1">Mã được sinh tự động dựa trên Loại tài liệu & Tài liệu cha.</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Tài liệu gốc (Parent)</label>
                            <SearchableSelect options={availableParents} value={formData.tai_lieu_cha_id} onChange={(val) => handleSelectChange('tai_lieu_cha_id', val)} placeholder="-- Chọn tài liệu cha (nếu có) --" />
                        </div>

                        {/* Row: Type & Field */}
                        <div>
                            <label className={labelClass}>Loại tài liệu</label>
                            <SearchableSelect options={loaiTaiLieuOptions} value={formData.loai_tai_lieu} onChange={(val) => handleSelectChange('loai_tai_lieu', val)} placeholder="-- Chọn loại --" />
                        </div>
                        <div>
                            <label className={labelClass}>Lĩnh vực hoạt động</label>
                            <SearchableSelect options={linhVucOptions} value={formData.linh_vuc} onChange={(val) => handleSelectChange('linh_vuc', val)} placeholder="-- Chọn lĩnh vực --" />
                        </div>

                        {/* Standards (Moved here) */}
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

                        <div className="md:col-span-2">
                            <label className={labelClass}>Mô tả tóm tắt</label>
                            <textarea name="mo_ta_tom_tat" value={formData.mo_ta_tom_tat} onChange={handleChange} className={`${textareaClass} min-h-[80px]`} placeholder="Mô tả phạm vi áp dụng, mục đích của tài liệu..." />
                        </div>
                    </div>
                </div>

                {/* SECTION 2: CONTENT & ATTACHMENTS */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2">
                        <Paperclip size={16} className="text-orange-500"/> Nội dung & Đính kèm
                    </h4>
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 group">
                            <div className="flex gap-3 flex-col sm:flex-row items-center">
                                <div className="flex-1 w-full relative">
                                    <LinkIcon size={16} className="absolute left-3 top-3 text-gray-400"/>
                                    <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={`${inputClass} pl-9 bg-white dark:bg-slate-950`} placeholder="Dán đường dẫn tài liệu (Google Drive, SharePoint...) tại đây" />
                                </div>
                                <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-center">
                                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('pdf')} className="hover:text-red-600 hover:border-red-200 bg-white dark:bg-slate-900"><FileType size={14} className="mr-1"/> PDF</Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('doc')} className="hover:text-blue-600 hover:border-blue-200 bg-white dark:bg-slate-900"><FileText size={14} className="mr-1"/> Word</Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('excel')} className="hover:text-emerald-600 hover:border-emerald-200 bg-white dark:bg-slate-900"><FileSpreadsheet size={14} className="mr-1"/> Excel</Button>
                                </div>
                            </div>
                            <div className="text-center mt-2 text-[10px] text-gray-400 group-hover:text-blue-500 transition-colors">
                                <UploadCloud size={14} className="inline mr-1" /> Hỗ trợ link Google Drive, OneDrive, Dropbox
                            </div>
                        </div>

                        {formData.dinh_kem && formData.dinh_kem.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2.5">
                                {formData.dinh_kem.map(file => {
                                    const config = getFileTypeConfig(file.loai);
                                    return (
                                        <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm group hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>{config.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate hover:text-blue-600 block">{file.ten_file}</a>
                                                <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-2">
                                                    <span>{format(new Date(file.ngay_upload), 'dd/MM/yyyy HH:mm')}</span>
                                                    <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                    <span className="uppercase">{file.loai}</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeFile(file.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Right Column (Sidebar) - 4 cols */}
            <div className="lg:col-span-4 space-y-6">
                
                {/* NEW DESIGN: Responsibility Workflow */}
                <div className="rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-950/30 flex items-center gap-2">
                        <GitCommit size={16} className="text-purple-500"/>
                        <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase">Quy trình xử lý</h4>
                    </div>
                    
                    <div className="p-5 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-9 top-8 bottom-12 w-0.5 bg-gray-200 dark:bg-slate-800 z-0"></div>

                        {/* Step 1: Draft */}
                        <div className="relative z-10 mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                                    <PenTool size={14} />
                                </div>
                                <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Bước 1: Soạn thảo</span>
                            </div>
                            <div className="pl-11">
                                <SearchableSelect options={drafterOptions} value={formData.id_nguoi_soan_thao} onChange={(val) => handleSelectChange('id_nguoi_soan_thao', val)} placeholder="Người soạn thảo..." />
                            </div>
                        </div>

                        {/* Step 2: Review */}
                        <div className="relative z-10 mb-6">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                                    <SearchIcon size={14} />
                                </div>
                                <span className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">Bước 2: Xem xét</span>
                            </div>
                            <div className="pl-11">
                                <SearchableSelect options={reviewerOptions} value={formData.id_nguoi_xem_xet} onChange={(val) => handleSelectChange('id_nguoi_xem_xet', val)} placeholder="Người xem xét..." />
                            </div>
                        </div>

                        {/* Step 3: Approve */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                                    <FileSignature size={14} />
                                </div>
                                <span className="text-xs font-bold uppercase text-green-700 dark:text-green-500">Bước 3: Phê duyệt</span>
                            </div>
                            <div className="pl-11">
                                <SearchableSelect options={approverOptions} value={formData.id_nguoi_phe_duyet} onChange={(val) => handleSelectChange('id_nguoi_phe_duyet', val)} placeholder="Người phê duyệt..." />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Control & Validity */}
                <div className="space-y-4">
                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-2"><Calendar size={16} className="text-green-500"/> Kiểm soát & Hiệu lực</h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={labelClass}>Phiên bản (Ver)</label>
                            <input name="phien_ban" value={formData.phien_ban} onChange={handleChange} className={inputClass} placeholder="1.0" />
                        </div>
                        <div>
                            <label className={labelClass}>Lần ban hành</label>
                            <input type="number" min="0" name="lan_ban_hanh" value={formData.lan_ban_hanh} onChange={handleChange} className={inputClass} />
                        </div>
                    </div>
                    
                    <div>
                        <label className={labelClass}>Ngày ban hành / Hiệu lực</label>
                        <div className="grid grid-cols-2 gap-3">
                            <input type="date" name="ngay_ban_hanh" value={formData.ngay_ban_hanh} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark] text-[11px] px-2`} title="Ngày ban hành"/>
                            <input type="date" name="ngay_hieu_luc" value={formData.ngay_hieu_luc} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark] text-[11px] px-2`} title="Ngày hiệu lực"/>
                        </div>
                    </div>
                    
                    <div className={`p-4 rounded-xl border transition-all ${isReviewEnabled ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800' : 'bg-gray-50 dark:bg-slate-800 border-transparent'}`}>
                        <label className="flex items-center justify-between cursor-pointer mb-3">
                            <span className={`text-xs font-bold flex items-center gap-2 ${isReviewEnabled ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600 dark:text-gray-400'}`}><RefreshCw size={14}/> Định kỳ rà soát</span>
                            <div className={`w-9 h-5 rounded-full relative transition-colors ${isReviewEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-slate-600'}`}>
                                <input type="checkbox" className="hidden" checked={isReviewEnabled} onChange={toggleReview} />
                                <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all shadow-sm ${isReviewEnabled ? 'left-5' : 'left-1'}`}></div>
                            </div>
                        </label>
                        {isReviewEnabled && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
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
