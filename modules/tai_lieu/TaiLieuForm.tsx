
import React, { useState, useEffect, useMemo } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Info, Calendar, FileType, Paperclip, Trash2, Link as LinkIcon, FileText, FileSpreadsheet, RefreshCw, Lock, Unlock, Layers, Tag, Save, ArrowRight, FileBox, User, Minus, Plus, GitCommit } from 'lucide-react';
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
    thu_tu: 1,
    phien_ban: '1.0',
    lan_ban_hanh: 1,
    ngay_ban_hanh: '',
    ngay_hieu_luc: '',
    chu_ky_ra_soat: 0,
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
      const currentType = masterData.loaiTaiLieu.find(t => t.id === formData.id_loai_tai_lieu);
      const currentLevel = currentType?.cap_do || 99;

      return fullList
        .filter(d => {
            if (d.id === initialData?.id) return false;
            if (!d.id_loai_tai_lieu) return false;
            const parentType = masterData.loaiTaiLieu.find(t => t.id === d.id_loai_tai_lieu);
            const parentLevel = parentType?.cap_do || 99;
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

  // Auto-generate code logic
  useEffect(() => {
      if (initialData || !isCodeLocked) return;
      if (!formData.id_loai_tai_lieu) return;

      const docTypeConfig = masterData.loaiTaiLieu.find(t => t.id === formData.id_loai_tai_lieu);
      if (!docTypeConfig) return;

      const prefix = docTypeConfig.ma_viet_tat || 'TL';
      const separator = docTypeConfig.ky_tu_noi || '.';
      const digitCount = docTypeConfig.do_dai_so || 2;

      let newCode = '';
      const siblings = fullList.filter(d => {
          const isSameType = d.id_loai_tai_lieu === formData.id_loai_tai_lieu;
          const isSameParent = formData.tai_lieu_cha_id 
              ? d.tai_lieu_cha_id === formData.tai_lieu_cha_id 
              : !d.tai_lieu_cha_id;
          return isSameType && isSameParent && d.id !== initialData?.id;
      });

      const nextNum = siblings.length + 1;
      const paddedNum = String(nextNum).padStart(digitCount, '0');

      if (formData.tai_lieu_cha_id) {
          const parentDoc = fullList.find(d => d.id === formData.tai_lieu_cha_id);
          if (parentDoc) {
             newCode = `${parentDoc.ma_tai_lieu}${separator}${prefix}${paddedNum}`;
          }
      } else {
          newCode = `${prefix}${paddedNum}`;
      }

      if (newCode && newCode !== formData.ma_tai_lieu) {
          setFormData(prev => ({ ...prev, ma_tai_lieu: newCode }));
      }

  }, [formData.tai_lieu_cha_id, formData.id_loai_tai_lieu, isCodeLocked, fullList, masterData.loaiTaiLieu, initialData]);

  // Auto-calculate "Thứ tự hiển thị"
  useEffect(() => {
      if (initialData) return;
      const siblings = fullList.filter(d => 
          d.id_loai_tai_lieu === formData.id_loai_tai_lieu &&
          d.tai_lieu_cha_id === formData.tai_lieu_cha_id
      );
      const maxOrder = siblings.length > 0 ? Math.max(...siblings.map(d => d.thu_tu || 0)) : 0;
      setFormData(prev => ({ ...prev, thu_tu: maxOrder + 1 }));
  }, [formData.id_loai_tai_lieu, formData.tai_lieu_cha_id, fullList, initialData]);


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
        if (name === 'ngay_ban_hanh' && !prev.ngay_hieu_luc) {
            newData.ngay_hieu_luc = value; 
        }
        return newData;
    });
  };

  const adjustNumber = (field: 'lan_ban_hanh' | 'chu_ky_ra_soat' | 'thu_tu', amount: number) => {
      setFormData(prev => {
          const current = (prev[field] as number) || 0;
          const next = current + amount;
          if (field === 'thu_tu' && next < 1) return prev;
          return { ...prev, [field]: next < 0 ? 0 : next };
      });
  };

  const handleSelectChange = (key: keyof TaiLieu, value: any) => {
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

  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 ring-primary/20 focus:border-primary outline-none transition-all text-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-800 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClass = "text-xs font-bold text-muted-foreground uppercase mb-1.5 block tracking-wide";
  const cardClass = "bg-card text-card-foreground rounded-xl border border-border shadow-sm p-5 h-full flex flex-col";

  // Reusable Compact Counter Component
  const CompactCounter = ({ value, onChange, min = 0 }: { value: number, onChange: (val: number) => void, min?: number }) => (
    <div className="flex items-center h-8 w-[120px] rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm hover:border-blue-400 transition-colors">
        <button type="button" onClick={() => onChange(-1)} className="w-8 h-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-500 hover:text-blue-600 transition-colors border-r border-gray-200 dark:border-slate-700"><Minus size={12}/></button>
        <input 
            type="number" 
            min={min} 
            className="flex-1 w-full h-full text-center text-xs font-bold text-gray-700 dark:text-gray-200 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            value={value} 
            onChange={(e) => onChange(0)} // Dummy, handled by parent mostly or adjust
            readOnly
        />
        <button type="button" onClick={() => onChange(1)} className="w-8 h-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-500 hover:text-blue-600 transition-colors border-l border-gray-200 dark:border-slate-700"><Plus size={12}/></button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background">
      <form id="document-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
        
        {/* --- BLOCK 1: MAIN INFO --- */}
        <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
                <FileBox size={18} className="text-primary"/>
                <h3 className="text-sm font-bold text-foreground uppercase">Thông tin định danh</h3>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 md:col-span-8 space-y-4">
                    <div>
                        <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
                        <input name="ten_tai_lieu" className={`${inputClass} text-base font-medium`} value={formData.ten_tai_lieu} onChange={handleChange} placeholder="Nhập tên tài liệu..." autoFocus />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Loại tài liệu <span className="text-red-500">*</span></label>
                            <SearchableSelect options={loaiTaiLieuOptions} value={formData.id_loai_tai_lieu} onChange={(val) => handleSelectChange('id_loai_tai_lieu', String(val))} placeholder="-- Chọn loại --" />
                        </div>
                        <div>
                            <label className={labelClass}>Tài liệu cha (Nếu có)</label>
                            <SearchableSelect options={availableParents} value={formData.tai_lieu_cha_id} onChange={(val) => handleSelectChange('tai_lieu_cha_id', String(val))} placeholder="-- Chọn tài liệu cấp trên --" disabled={!formData.id_loai_tai_lieu} />
                        </div>
                    </div>
                </div>

                <div className="col-span-12 md:col-span-4 space-y-4">
                     <div className="bg-muted/30 p-4 rounded-xl border border-border">
                         <label className={labelClass}>Mã tài liệu (Auto)</label>
                         <div className="flex gap-2 mb-2">
                             <input name="ma_tai_lieu" className={`${inputClass} font-mono font-bold text-primary`} value={formData.ma_tai_lieu} onChange={handleChange} readOnly={isCodeLocked} placeholder="QT-..." />
                             <button type="button" onClick={() => setIsCodeLocked(!isCodeLocked)} className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors" title={isCodeLocked ? "Mở khóa chỉnh sửa" : "Khóa tự động"}>
                                 {isCodeLocked ? <Lock size={16}/> : <Unlock size={16}/>}
                             </button>
                         </div>
                         <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Info size={12}/> Mã số được sinh tự động theo quy tắc.
                         </div>
                     </div>
                     
                     {/* COMPACT ORDER INPUT */}
                     <div>
                        <label className={labelClass}>Thứ tự hiển thị</label>
                        <CompactCounter value={formData.thu_tu || 1} onChange={(val) => adjustNumber('thu_tu', val)} min={1} />
                     </div>
                </div>
            </div>
        </div>

        {/* --- BLOCK 2: DETAILS --- */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={cardClass}>
                <div className="flex items-center gap-2 pb-2 mb-4 border-b border-border">
                    <Layers size={18} className="text-purple-500"/>
                    <h3 className="text-sm font-bold text-foreground uppercase">Phân loại & Tiêu chuẩn</h3>
                </div>
                <div className="space-y-4 flex-1">
                    <div>
                        <label className={labelClass}>Lĩnh vực hoạt động</label>
                        <SearchableSelect options={linhVucOptions} value={formData.id_linh_vuc} onChange={(val) => handleSelectChange('id_linh_vuc', String(val))} placeholder="-- Chọn lĩnh vực --" />
                    </div>
                    <div>
                        <label className={labelClass}>Tiêu chuẩn áp dụng</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                           {masterData.tieuChuan.map(tc => (
                             <button key={tc.id} type="button" onClick={() => toggleTieuChuan(tc.id)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${formData.id_tieu_chuan?.includes(tc.id) ? 'bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-800 dark:text-blue-300' : 'bg-background border-input text-muted-foreground hover:bg-muted'}`}>
                                <Tag size={12}/> {tc.ten}
                             </button>
                           ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className={cardClass}>
                <div className="flex items-center gap-2 pb-2 mb-4 border-b border-border">
                    <User size={18} className="text-orange-500"/>
                    <h3 className="text-sm font-bold text-foreground uppercase">Trách nhiệm</h3>
                </div>
                <div className="space-y-4 flex-1">
                    <div><label className={labelClass}>Người soạn thảo</label><SearchableSelect options={drafterOptions} value={formData.nguoi_soan_thao} onChange={(val) => handleSelectChange('nguoi_soan_thao', String(val))} placeholder="-- Chọn nhân sự --"/></div>
                    <div><label className={labelClass}>Người xem xét</label><SearchableSelect options={reviewerOptions} value={formData.nguoi_xem_xet} onChange={(val) => handleSelectChange('nguoi_xem_xet', String(val))} placeholder="-- Chọn nhân sự --"/></div>
                    <div><label className={labelClass}>Người phê duyệt</label><SearchableSelect options={approverOptions} value={formData.nguoi_phe_duyet} onChange={(val) => handleSelectChange('nguoi_phe_duyet', String(val))} placeholder="-- Chọn nhân sự --"/></div>
                </div>
            </div>
        </div>

        {/* --- BLOCK 3: DATE & REVIEW --- */}
        <div className="mt-8">
            <div className="flex items-center gap-2 pb-2 mb-4 border-b border-border">
                <Calendar size={18} className="text-green-500"/>
                <h3 className="text-sm font-bold text-foreground uppercase">Hiệu lực & Kiểm soát</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                   <label className={labelClass}>Phiên bản / Lần BH</label>
                   <div className="flex gap-4">
                      <div className="relative flex-1"><GitCommit size={14} className="absolute left-3 top-2.5 text-muted-foreground"/><input className={`${inputClass} pl-9 font-mono`} value={formData.phien_ban} onChange={handleChange} name="phien_ban" placeholder="1.0" /></div>
                      {/* COMPACT COUNTER */}
                      <CompactCounter value={formData.lan_ban_hanh || 1} onChange={(val) => adjustNumber('lan_ban_hanh', val)} min={1} />
                   </div>
                </div>

                <div>
                   <label className={labelClass}>Ngày ban hành / Hiệu lực</label>
                   <div className="flex items-center gap-2">
                       <input type="date" name="ngay_ban_hanh" className={`${inputClass} dark:[color-scheme:dark]`} value={formData.ngay_ban_hanh} onChange={handleChange}/>
                       <ArrowRight size={16} className="text-muted-foreground"/>
                       <input type="date" name="ngay_hieu_luc" className={`${inputClass} dark:[color-scheme:dark]`} value={formData.ngay_hieu_luc} onChange={handleChange}/>
                   </div>
                </div>

                <div className={`p-4 rounded-xl border transition-all ${isReviewEnabled ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900/50' : 'bg-muted/30 border-border'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-foreground uppercase flex items-center gap-2"><RefreshCw size={14}/> Định kỳ rà soát</label>
                        <div onClick={toggleReview} className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${isReviewEnabled ? 'bg-orange-500' : 'bg-muted-foreground'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isReviewEnabled ? 'translate-x-5' : ''}`}></div></div>
                    </div>
                    {isReviewEnabled && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                            {/* COMPACT COUNTER */}
                            <CompactCounter value={formData.chu_ky_ra_soat || 12} onChange={(val) => adjustNumber('chu_ky_ra_soat', val === 1 ? 6 : -6)} min={0} />
                            <span className="text-xs text-muted-foreground">Tháng / lần</span>
                        </div>
                    )}
                    {isReviewEnabled && formData.ngay_ra_soat_tiep_theo && <div className="mt-2 text-[10px] text-orange-600 dark:text-orange-400 font-medium">Tiếp theo: {format(new Date(formData.ngay_ra_soat_tiep_theo), 'dd/MM/yyyy')}</div>}
                </div>
            </div>
        </div>

        {/* --- BLOCK 4: CONTENT & FILES --- */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                   <FileText size={18} className="text-blue-500"/>
                   <h3 className="text-sm font-bold text-foreground uppercase">Nội dung tóm tắt</h3>
                </div>
                <textarea name="mo_ta_tom_tat" className="w-full h-40 p-3 rounded-xl border border-input bg-background focus:ring-2 ring-primary/20 focus:border-primary outline-none text-sm resize-none" placeholder="Mô tả phạm vi, mục đích của tài liệu..." value={formData.mo_ta_tom_tat} onChange={handleChange}></textarea>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                   <Paperclip size={18} className="text-indigo-500"/>
                   <h3 className="text-sm font-bold text-foreground uppercase">Đính kèm file</h3>
                </div>
                
                <div className="flex gap-2">
                   <div className="relative flex-1">
                      <LinkIcon size={16} className="absolute left-3 top-2.5 text-muted-foreground"/>
                      <input className={`${inputClass} pl-9`} placeholder="Dán link Google Drive / SharePoint..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFile('link'))} />
                   </div>
                   <button type="button" onClick={() => handleAddFile('pdf')} className="p-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900 dark:text-red-400" title="Link PDF"><FileType size={20}/></button>
                   <button type="button" onClick={() => handleAddFile('doc')} className="p-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-400" title="Link Word"><FileText size={20}/></button>
                   <button type="button" onClick={() => handleAddFile('excel')} className="p-2 bg-green-50 text-green-600 border border-green-100 rounded-lg hover:bg-green-100 dark:bg-green-900/20 dark:border-green-900 dark:text-green-400" title="Link Excel"><FileSpreadsheet size={20}/></button>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                   {formData.dinh_kem && formData.dinh_kem.length > 0 ? (
                      formData.dinh_kem.map(file => (
                         <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border group">
                             <div className="flex items-center gap-2 overflow-hidden">
                                {file.loai === 'pdf' ? <FileType size={14} className="text-red-500 shrink-0"/> : file.loai === 'excel' ? <FileSpreadsheet size={14} className="text-green-500 shrink-0"/> : <FileText size={14} className="text-blue-500 shrink-0"/>}
                                <a href={file.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-foreground hover:underline truncate">{file.ten_file}</a>
                             </div>
                             <button type="button" onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                         </div>
                      ))
                   ) : <div className="text-center text-xs text-muted-foreground py-4 italic">Chưa có file đính kèm</div>}
                </div>
            </div>
        </div>
      </form>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-3 shrink-0">
         <Button variant="ghost" onClick={onCancel}>Hủy bỏ</Button>
         <Button onClick={() => handleSubmit()} leftIcon={<Save size={16}/>}>Lưu tài liệu</Button>
      </div>
    </div>
  );
};
