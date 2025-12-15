
import React, { useState, useEffect, useMemo } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Info, Calendar, FileType, Paperclip, Trash2, Link as LinkIcon, FileText, FileSpreadsheet, File, RefreshCw, Lock, Unlock, Layers, Tag, UploadCloud, Save, PenTool, Search as SearchIcon, FileSignature, GitCommit, ArrowRight, Fingerprint, FileBox, User, Network } from 'lucide-react';
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
    id_loai_tai_lieu: '',
    id_linh_vuc: '',
    id_tieu_chuan: [],
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

  // --- FILTER PARENT DOCUMENTS LOGIC ---
  const availableParents = useMemo(() => {
      // 1. Get current doc level
      const currentType = masterData.loaiTaiLieu.find(t => t.id === formData.id_loai_tai_lieu);
      const currentLevel = currentType?.cap_do || 99; // Default high level if not found

      // 2. Filter list
      return fullList
        .filter(d => {
            // Exclude self
            if (d.id === initialData?.id) return false;
            
            // Exclude undefined type docs
            if (!d.id_loai_tai_lieu) return false;

            // Find parent's level
            const parentType = masterData.loaiTaiLieu.find(t => t.id === d.id_loai_tai_lieu);
            const parentLevel = parentType?.cap_do || 99;

            // Strict Rule: Parent must have smaller Level number (Higher Hierarchy)
            // e.g. If creating Level 2 (Process), show Level 1 (Policy)
            return parentLevel < currentLevel;
        })
        .map(d => ({
            value: d.id,
            label: d.ten_tai_lieu,
            subLabel: `[${d.ma_tai_lieu}]`
        }));
  }, [fullList, initialData, formData.id_loai_tai_lieu, masterData.loaiTaiLieu]);

  const loaiTaiLieuOptions = useMemo(() => masterData.loaiTaiLieu.map(i => ({ value: i.id, label: i.ten, subLabel: `Cấp ${i.cap_do || '?'}` })), [masterData.loaiTaiLieu]);
  const linhVucOptions = useMemo(() => masterData.linhVuc.map(i => ({ value: i.id, label: i.ten })), [masterData.linhVuc]);
  
  const mapUserToOption = (u: NhanSu) => ({ value: u.id, label: u.ho_ten, subLabel: u.chuc_vu });
  
  const drafterOptions = useMemo(() => masterData.nhanSu.filter(u => u.roles.includes('SOAN_THAO') || u.roles.includes('QUAN_TRI')).map(mapUserToOption), [masterData.nhanSu]);
  const reviewerOptions = useMemo(() => masterData.nhanSu.filter(u => u.roles.includes('XEM_XET') || u.roles.includes('QUAN_TRI')).map(mapUserToOption), [masterData.nhanSu]);
  const approverOptions = useMemo(() => masterData.nhanSu.filter(u => u.roles.includes('PHE_DUYET') || u.roles.includes('QUAN_TRI')).map(mapUserToOption), [masterData.nhanSu]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setIsReviewEnabled(!!initialData.chu_ky_ra_soat && initialData.chu_ky_ra_soat > 0);
      setIsCodeLocked(false);
    } else {
        setIsCodeLocked(true);
        setIsReviewEnabled(false);
        setFormData(prev => ({ ...prev, trang_thai: TrangThaiTaiLieu.SOAN_THAO }));
    }
  }, [initialData]);

  // FIX: Auto-generate code logic (Supports Root documents + ID Lookup)
  useEffect(() => {
      // Only run if not manually editing (Locked) and document type is selected
      if (initialData || !isCodeLocked) return;
      if (!formData.id_loai_tai_lieu) return;

      // Lookup prefix from Master Data using ID
      const docTypeConfig = masterData.loaiTaiLieu.find(t => t.id === formData.id_loai_tai_lieu);
      if (!docTypeConfig) return;

      const prefix = docTypeConfig.ma_viet_tat || 'TL';
      const separator = docTypeConfig.ky_tu_noi || '.';
      const digitCount = docTypeConfig.do_dai_so || 2;

      let newCode = '';

      // Count siblings to determine number
      const siblings = fullList.filter(d => {
          const isSameType = d.id_loai_tai_lieu === formData.id_loai_tai_lieu;
          const isSameParent = formData.tai_lieu_cha_id 
              ? d.tai_lieu_cha_id === formData.tai_lieu_cha_id 
              : !d.tai_lieu_cha_id; // Both have no parent (Root)
          return isSameType && isSameParent && d.id !== initialData?.id;
      });

      const nextNum = siblings.length + 1;
      const paddedNum = String(nextNum).padStart(digitCount, '0');

      if (formData.tai_lieu_cha_id) {
          // Child Document: ParentCode + Separator + TypePrefix + Number
          const parentDoc = fullList.find(d => d.id === formData.tai_lieu_cha_id);
          if (parentDoc) {
             newCode = `${parentDoc.ma_tai_lieu}${separator}${prefix}${paddedNum}`;
          }
      } else {
          // Root Document: TypePrefix + Number (e.g., QT01)
          newCode = `${prefix}${paddedNum}`;
      }

      if (newCode && newCode !== formData.ma_tai_lieu) {
          setFormData(prev => ({ ...prev, ma_tai_lieu: newCode }));
      }

  }, [formData.tai_lieu_cha_id, formData.id_loai_tai_lieu, isCodeLocked, fullList, masterData.loaiTaiLieu, initialData]);


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
        ? (value === '' ? 0 : parseInt(value))
        : value;

    setFormData(prev => {
        const newData = { ...prev, [name]: finalValue };
        
        // Auto-set Effective Date if Issue Date is set and Effective Date is empty
        if (name === 'ngay_ban_hanh' && !prev.ngay_hieu_luc) {
            newData.ngay_hieu_luc = value; 
        }
        return newData;
    });
  };

  const handleSelectChange = (key: keyof TaiLieu, value: any) => {
      // If changing document type, reset parent to avoid invalid hierarchy
      if (key === 'id_loai_tai_lieu') {
          setFormData(prev => ({ ...prev, [key]: value, tai_lieu_cha_id: '' }));
      } else {
          setFormData(prev => ({ ...prev, [key]: value }));
      }
  };

  const toggleTieuChuan = (id: string) => {
    const currentList = formData.id_tieu_chuan || [];
    if (currentList.includes(id)) {
      setFormData(prev => ({ ...prev, id_tieu_chuan: currentList.filter(item => item !== id) }));
    } else {
      setFormData(prev => ({ ...prev, id_tieu_chuan: [...currentList, id] }));
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
      return filename.length > 30 ? filename.substring(0, 30) + '...' : filename;
    } catch (e) {
      return url.length > 30 ? url.substring(0, 30) + '...' : url;
    }
  };

  const handleAddFile = (type: 'pdf' | 'doc' | 'excel' | 'link') => {
    if (!urlInput.trim()) {
      dialog.alert("Vui lòng dán đường dẫn (Link) trước!", { type: 'warning' });
      return;
    }
    const file: DinhKem = {
      id: `file_${Date.now()}`,
      ten_file: getFileNameFromUrl(urlInput),
      url: urlInput,
      loai: type,
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
    // Validation: Effective Date must be >= Issue Date
    if (formData.ngay_ban_hanh && formData.ngay_hieu_luc) {
        if (new Date(formData.ngay_hieu_luc) < new Date(formData.ngay_ban_hanh)) {
            dialog.alert("Ngày hiệu lực phải sau hoặc bằng ngày ban hành!", { type: 'warning' });
            return;
        }
    }

    const cleanData = { ...formData };
    if (cleanData.ngay_ra_soat_tiep_theo === '') cleanData.ngay_ra_soat_tiep_theo = null as any;
    if (cleanData.ngay_ban_hanh === '') cleanData.ngay_ban_hanh = null as any;
    if (cleanData.ngay_hieu_luc === '') cleanData.ngay_hieu_luc = null as any;
    onSave(cleanData);
  };

  // Styling (Fixed Dark Mode Color)
  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 ring-primary/20 focus:border-primary outline-none transition-all text-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-800 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClass = "text-xs font-bold text-muted-foreground uppercase mb-1.5 block tracking-wide";
  const cardClass = "bg-card text-card-foreground rounded-xl border border-border shadow-sm p-5 h-full flex flex-col";

  return (
    <div className="flex flex-col h-full bg-background">
      <form id="document-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
        
        {/* --- BLOCK 1: IDENTITY (Header) --- */}
        <div className="mb-6 bg-card text-card-foreground p-5 rounded-xl border border-border shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-8">
                    <label className={labelClass}><FileBox size={14} className="text-primary inline mr-1"/> Tên tài liệu <span className="text-destructive">*</span></label>
                    <input required name="ten_tai_lieu" value={formData.ten_tai_lieu} onChange={handleChange} className={`${inputClass} text-lg font-semibold h-11 placeholder:font-normal`} placeholder="VD: Quy trình kiểm soát chất lượng đầu vào" autoFocus />
                </div>
                <div className="md:col-span-4">
                    <label className={labelClass}><Fingerprint size={14} className="text-purple-500 inline mr-1"/> Mã tài liệu <span className="text-destructive">*</span></label>
                    <div className="relative">
                        <input 
                            required name="ma_tai_lieu" value={formData.ma_tai_lieu} onChange={handleChange} 
                            className={`${inputClass} text-lg font-mono font-bold text-primary h-11 uppercase`} 
                            placeholder="Tự động sinh..." readOnly={isCodeLocked} 
                        />
                        <button type="button" onClick={() => setIsCodeLocked(!isCodeLocked)} className="absolute right-3 top-3 text-muted-foreground hover:text-primary transition-colors">
                            {isCodeLocked ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* --- BLOCK 2: CLASSIFICATION (Left) --- */}
            <div className={cardClass}>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3 mb-4">
                    <Layers size={16} className="text-primary"/> Phân loại & Phạm vi
                </h4>
                <div className="space-y-4 flex-1">
                    <div><label className={labelClass}>Loại tài liệu</label><SearchableSelect options={loaiTaiLieuOptions} value={formData.id_loai_tai_lieu} onChange={(val) => handleSelectChange('id_loai_tai_lieu', String(val))} placeholder="-- Chọn loại --" /></div>
                    <div><label className={labelClass}>Lĩnh vực</label><SearchableSelect options={linhVucOptions} value={formData.id_linh_vuc} onChange={(val) => handleSelectChange('id_linh_vuc', String(val))} placeholder="-- Chọn lĩnh vực --" /></div>
                    
                    {/* Improved Parent Selection Logic */}
                    <div>
                        <label className={labelClass}>Tài liệu cha (Parent)</label>
                        <SearchableSelect 
                            options={availableParents} 
                            value={formData.tai_lieu_cha_id} 
                            onChange={(val) => handleSelectChange('tai_lieu_cha_id', val)} 
                            placeholder={!formData.id_loai_tai_lieu ? "Chọn loại tài liệu trước" : availableParents.length > 0 ? "-- Chọn tài liệu cấp trên --" : "-- Không có tài liệu cha phù hợp --"} 
                            disabled={!formData.id_loai_tai_lieu}
                        />
                        {formData.id_loai_tai_lieu && (
                            <p className="text-[10px] text-gray-400 mt-1 italic flex items-center gap-1">
                                <Network size={10} /> Hệ thống tự động lọc các tài liệu cấp cao hơn.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className={labelClass}>Tiêu chuẩn áp dụng</label>
                        <div className="flex flex-wrap gap-2 pt-1">{masterData.tieuChuan.map(item => (<button key={item.id} type="button" onClick={() => toggleTieuChuan(item.id)} className={`px-2.5 py-1.5 rounded-md text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${formData.id_tieu_chuan?.includes(item.id) ? 'bg-primary/10 text-primary border-primary/20 shadow-sm' : 'bg-background border-border text-muted-foreground hover:bg-muted'}`}>{formData.id_tieu_chuan?.includes(item.id) && <Tag size={10} className="fill-current" />} {item.ten}</button>))}</div>
                    </div>
                </div>
            </div>

            {/* --- BLOCK 3: CONTROL (Center) --- */}
            <div className={cardClass}>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3 mb-4">
                    <Calendar size={16} className="text-green-500"/> Kiểm soát hiệu lực
                </h4>
                <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className={labelClass}>Phiên bản</label><input name="phien_ban" value={formData.phien_ban} onChange={handleChange} className={`${inputClass} text-center font-mono font-bold`} placeholder="1.0" /></div>
                        <div><label className={labelClass}>Lần ban hành</label><input type="number" min="0" name="lan_ban_hanh" value={formData.lan_ban_hanh} onChange={handleChange} className={`${inputClass} text-center font-mono`} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Ngày ban hành</label>
                            <input type="date" name="ngay_ban_hanh" value={formData.ngay_ban_hanh} onChange={handleChange} className={`${inputClass} cursor-pointer dark:[color-scheme:dark]`} />
                        </div>
                        <div>
                            <label className={labelClass}>Ngày hiệu lực</label>
                            {/* ADDED MIN DATE CONSTRAINT */}
                            <input 
                                type="date" 
                                name="ngay_hieu_luc" 
                                value={formData.ngay_hieu_luc} 
                                onChange={handleChange} 
                                min={formData.ngay_ban_hanh} // Cannot be earlier than Issue Date
                                className={`${inputClass} cursor-pointer dark:[color-scheme:dark]`} 
                            />
                        </div>
                    </div>
                    
                    {/* Dark mode friendly Periodic Review Box */}
                    <div className={`p-3 rounded-xl border transition-all ${isReviewEnabled ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800/50' : 'bg-muted/50 border-border'}`}>
                        <label className="flex items-center justify-between cursor-pointer mb-2">
                            <span className={`text-xs font-bold flex items-center gap-1.5 ${isReviewEnabled ? 'text-orange-700 dark:text-orange-300' : 'text-muted-foreground'}`}><RefreshCw size={14}/> Rà soát định kỳ</span>
                            <div className={`w-8 h-4 rounded-full relative transition-colors ${isReviewEnabled ? 'bg-orange-500' : 'bg-muted-foreground/30'}`}>
                                <input type="checkbox" className="hidden" checked={isReviewEnabled} onChange={toggleReview} />
                                <div className={`w-2.5 h-2.5 bg-background rounded-full absolute top-0.5 transition-all shadow-sm ${isReviewEnabled ? 'left-5' : 'left-0.5'}`}></div>
                            </div>
                        </label>
                        {isReviewEnabled && (
                            <div className="flex items-end gap-2 animate-in fade-in">
                                <div className="flex-1">
                                    <input 
                                        type="number" 
                                        min="1" 
                                        name="chu_ky_ra_soat" 
                                        value={formData.chu_ky_ra_soat || ''} 
                                        onChange={handleChange} 
                                        className="w-full h-8 px-2 rounded-lg border border-orange-300 dark:border-orange-700/50 bg-background focus:ring-2 focus:ring-orange-500/20 outline-none text-xs font-bold text-center text-foreground placeholder:text-muted-foreground" 
                                        placeholder="12" 
                                    />
                                    <span className="text-[9px] text-orange-600/80 dark:text-orange-400/80 block text-center mt-1 font-medium">Tháng/lần</span>
                                </div>
                                <div className="flex-[2]">
                                    <input 
                                        type="date" 
                                        name="ngay_ra_soat_tiep_theo" 
                                        value={formData.ngay_ra_soat_tiep_theo || ''} 
                                        onChange={handleChange} 
                                        min={formData.ngay_hieu_luc} // Should be after Effective Date
                                        className="w-full h-8 px-2 rounded-lg border border-orange-300 dark:border-orange-700/50 bg-background outline-none text-xs text-foreground dark:[color-scheme:dark]" 
                                    />
                                    <span className="text-[9px] text-orange-600/80 dark:text-orange-400/80 block text-center mt-1 font-medium">Lần tới</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- BLOCK 4: ATTACHMENTS (Right) --- */}
            <div className={cardClass}>
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3 mb-4">
                    <Paperclip size={16} className="text-orange-500"/> Tài liệu đính kèm
                </h4>
                <div className="flex-1 flex flex-col min-h-0">
                    <div className="bg-muted/30 rounded-lg border border-dashed border-input p-3 mb-3 hover:border-primary/50 hover:bg-primary/5 transition-all">
                        <div className="w-full relative mb-2">
                            <LinkIcon size={14} className="absolute left-2.5 top-2.5 text-muted-foreground"/>
                            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={`${inputClass} pl-8 text-xs h-8`} placeholder="Dán link Drive/SharePoint..." />
                        </div>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('pdf')} className="flex-1 h-7 text-[10px] px-1 gap-1"><FileType size={12} className="text-red-500"/> PDF</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('doc')} className="flex-1 h-7 text-[10px] px-1 gap-1"><FileText size={12} className="text-blue-500"/> Word</Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('excel')} className="flex-1 h-7 text-[10px] px-1 gap-1"><FileSpreadsheet size={12} className="text-green-500"/> Excel</Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-2 max-h-[180px]">
                        {formData.dinh_kem?.map(file => (
                            <div key={file.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-card shadow-sm group hover:border-primary/50 transition-all">
                                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${file.loai === 'pdf' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-muted text-muted-foreground'}`}>{file.loai === 'pdf' ? <FileType size={16}/> : <File size={16}/>}</div>
                                <div className="flex-1 min-w-0"><a href={file.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-foreground truncate block hover:text-primary underline-offset-2 hover:underline">{file.ten_file}</a><span className="text-[10px] text-muted-foreground">{format(new Date(file.ngay_upload), 'dd/MM/yyyy')}</span></div>
                                <button type="button" onClick={() => removeFile(file.id)} className="p-1.5 text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* --- BLOCK 5: CONTENT (Full Width) --- */}
        <div className="mb-6 bg-card text-card-foreground p-5 rounded-xl border border-border shadow-sm">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-3 mb-4">
                <Info size={16} className="text-blue-500"/> Nội dung tóm tắt
            </h4>
            <textarea name="mo_ta_tom_tat" value={formData.mo_ta_tom_tat} onChange={handleChange} className={`${inputClass} h-auto min-h-[100px] resize-none p-3`} placeholder="Mô tả phạm vi áp dụng, mục đích và các nội dung chính của tài liệu..." />
        </div>

        {/* --- BLOCK 6: WORKFLOW (Horizontal Process) --- */}
        <div className="bg-card text-card-foreground p-6 rounded-xl border border-border shadow-sm">
            <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-6">
                <GitCommit size={16} className="text-purple-500"/> Ma trận trách nhiệm (Workflow)
            </h4>
            
            <div className="flex flex-col md:flex-row gap-4 items-stretch">
                {/* Step 1 */}
                <div className="flex-1 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900 p-4 relative group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 flex items-center justify-center font-bold shadow-sm"><PenTool size={18}/></div>
                        <div><p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wider">Bước 1</p><p className="text-sm font-bold text-foreground">Soạn thảo</p></div>
                    </div>
                    <SearchableSelect options={drafterOptions} value={formData.nguoi_soan_thao} onChange={(val) => handleSelectChange('nguoi_soan_thao', val)} placeholder="Chọn nhân sự..." />
                    <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 text-blue-200 dark:text-blue-800 z-10"><ArrowRight size={24}/></div>
                </div>

                {/* Step 2 */}
                <div className="flex-1 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900 p-4 relative group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300 flex items-center justify-center font-bold shadow-sm"><SearchIcon size={18}/></div>
                        <div><p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">Bước 2</p><p className="text-sm font-bold text-foreground">Xem xét</p></div>
                    </div>
                    <SearchableSelect options={reviewerOptions} value={formData.nguoi_xem_xet} onChange={(val) => handleSelectChange('nguoi_xem_xet', val)} placeholder="Chọn nhân sự..." />
                    <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 text-indigo-200 dark:text-indigo-800 z-10"><ArrowRight size={24}/></div>
                </div>

                {/* Step 3 */}
                <div className="flex-1 bg-green-50/50 dark:bg-green-900/10 rounded-xl border border-green-100 dark:border-green-900 p-4 relative group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300 flex items-center justify-center font-bold shadow-sm"><FileSignature size={18}/></div>
                        <div><p className="text-[10px] font-bold text-green-500 dark:text-green-400 uppercase tracking-wider">Bước 3</p><p className="text-sm font-bold text-foreground">Phê duyệt</p></div>
                    </div>
                    <SearchableSelect options={approverOptions} value={formData.nguoi_phe_duyet} onChange={(val) => handleSelectChange('nguoi_phe_duyet', val)} placeholder="Chọn lãnh đạo..." />
                </div>
            </div>
        </div>

        <button type="submit" className="hidden"></button>
      </form>
      
      <div className="flex justify-end gap-3 mt-4 pt-4 px-6 pb-4 border-t border-border bg-card">
            <Button variant="secondary" onClick={onCancel}>Hủy bỏ</Button>
            <Button onClick={() => handleSubmit()} leftIcon={<Save size={16} />} className="shadow-lg shadow-primary/20 px-6">Lưu dữ liệu</Button>
      </div>
    </div>
  );
};
