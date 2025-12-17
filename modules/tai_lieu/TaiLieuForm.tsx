
import React, { useState, useEffect, useMemo } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { MultiSelect } from '../../components/ui/MultiSelect';
import { Info, Calendar, FileType, Paperclip, Trash2, Link as LinkIcon, FileText, FileSpreadsheet, RefreshCw, Lock, Unlock, Layers, Tag, Save, ArrowRight, FileBox, User, Minus, Plus, GitCommit, Hash, AlertCircle } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { useDialog } from '../../contexts/DialogContext';
import { useToast } from '../../components/ui/Toast';

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
  const toast = useToast();

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
  
  const tieuChuanOptions = useMemo(() => masterData.tieuChuan.map(i => ({ 
      value: i.id, 
      label: i.ten,
      icon: Tag,
      style: { badgeColor: '#3b82f6', iconColor: '#fff' } // Blue default
  })), [masterData.tieuChuan]);

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
          if (field === 'lan_ban_hanh' && next < 0) return prev;
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
      toast.warning("Vui lòng dán đường dẫn (Link) trước!", "Thiếu thông tin");
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
    
    // 1. Kiểm tra trường bắt buộc
    if (!formData.ma_tai_lieu || !formData.ten_tai_lieu) {
        toast.warning("Vui lòng nhập Mã và Tên tài liệu!", "Thiếu thông tin");
        return;
    }
    
    if (!formData.id_loai_tai_lieu) {
        toast.warning("Vui lòng chọn Loại tài liệu!", "Thiếu thông tin");
        return;
    }
    
    // Validate Dates
    if (formData.ngay_ban_hanh && formData.ngay_hieu_luc) {
        if (new Date(formData.ngay_hieu_luc) < new Date(formData.ngay_ban_hanh)) {
            toast.warning("Ngày hiệu lực phải sau hoặc bằng ngày ban hành!", "Lỗi ngày tháng");
            return;
        }
    }

    // SANITIZE DATA (Fix 400 Bad Request for UUIDs)
    const cleanData: any = { ...formData };
    
    // Fields that must be null if empty string (UUIDs foreign keys)
    const nullableFields = [
        'tai_lieu_cha_id', 
        'id_linh_vuc', 
        'nguoi_soan_thao', // Thêm người soạn thảo
        'nguoi_xem_xet', 
        'nguoi_phe_duyet',
        'ngay_ban_hanh',
        'ngay_hieu_luc',
        'ngay_ra_soat_tiep_theo'
    ];

    nullableFields.forEach(field => {
        if (cleanData[field] === '' || cleanData[field] === undefined) {
            cleanData[field] = null;
        }
    });

    // Ensure numeric fields are numbers
    cleanData.thu_tu = Number(cleanData.thu_tu) || 0;
    cleanData.lan_ban_hanh = Number(cleanData.lan_ban_hanh) || 0;
    cleanData.chu_ky_ra_soat = Number(cleanData.chu_ky_ra_soat) || 0;
    
    // Ensure array fields
    cleanData.id_tieu_chuan = cleanData.id_tieu_chuan || [];

    onSave(cleanData);
  };

  const inputClass = "w-full h-9 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:ring-2 ring-primary/20 focus:border-primary outline-none transition-all text-sm disabled:opacity-60 disabled:bg-gray-100 dark:disabled:bg-slate-800 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClass = "text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 block tracking-wider";
  const cardHeaderClass = "text-xs font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 uppercase tracking-wide pb-2 border-b border-gray-100 dark:border-slate-800 mb-3";

  // Scientific Compact Counter
  const CompactCounter = ({ value, onChange, min = 0, className = "" }: { value: number, onChange: (val: number) => void, min?: number, className?: string }) => (
    <div className={`flex items-center h-9 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 overflow-hidden focus-within:ring-2 ring-primary/20 transition-all shadow-sm ${className}`}>
        <button type="button" onClick={() => onChange(-1)} className="w-8 h-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-slate-700 transition-colors">
            <Minus size={12}/>
        </button>
        <input 
            type="number" 
            min={min} 
            className="flex-1 w-full h-full text-center text-sm font-bold text-gray-800 dark:text-gray-100 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
            value={value} 
            onChange={(e) => onChange(0)} // Dummy
            readOnly
        />
        <button type="button" onClick={() => onChange(1)} className="w-8 h-full flex items-center justify-center bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 border-l border-gray-200 dark:border-slate-700 transition-colors">
            <Plus size={12}/>
        </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-slate-950">
      <form id="document-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6">
        
        <div className="grid grid-cols-12 gap-6">
            
            {/* LEFT COLUMN: MAIN CONTENT (8/12) */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
                
                {/* 1. Identity & Classification */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                    <div className={cardHeaderClass}>
                        <FileBox size={16} className="text-blue-500"/> Thông tin định danh
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
                            <input name="ten_tai_lieu" className={`${inputClass} font-semibold text-base h-10`} value={formData.ten_tai_lieu} onChange={handleChange} placeholder="Nhập tên tài liệu chính xác..." autoFocus />
                        </div>
                        
                        {/* Changed: Removed grid-cols-2 to allow full width for Document Type and Parent Document */}
                        <div>
                            <label className={labelClass}>Loại tài liệu <span className="text-red-500">*</span></label>
                            <SearchableSelect options={loaiTaiLieuOptions} value={formData.id_loai_tai_lieu} onChange={(val) => handleSelectChange('id_loai_tai_lieu', String(val))} placeholder="-- Chọn loại --"/>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Tài liệu cha (Quy trình mẹ)</label>
                            <SearchableSelect options={availableParents} value={formData.tai_lieu_cha_id} onChange={(val) => handleSelectChange('tai_lieu_cha_id', String(val))} placeholder="-- Chọn tài liệu cấp trên --" disabled={!formData.id_loai_tai_lieu}/>
                        </div>
                    </div>
                </div>

                {/* 2. Content */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex-1">
                    <div className={cardHeaderClass}>
                        <FileText size={16} className="text-indigo-500"/> Nội dung & Tệp tin
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className={labelClass}>Mô tả tóm tắt / Phạm vi áp dụng</label>
                            <textarea name="mo_ta_tom_tat" className="w-full h-32 p-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 focus:border-primary outline-none text-sm resize-none placeholder:text-gray-400" placeholder="Mô tả phạm vi, mục đích của tài liệu..." value={formData.mo_ta_tom_tat} onChange={handleChange}></textarea>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Đính kèm tệp</label>
                            <div className="flex gap-2 mb-3">
                                <div className="relative flex-1">
                                    <LinkIcon size={14} className="absolute left-3 top-2.5 text-gray-400"/>
                                    <input className={`${inputClass} pl-9`} placeholder="Dán link Google Drive / SharePoint..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFile('link'))} />
                                </div>
                                <button type="button" onClick={() => handleAddFile('pdf')} className="p-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors" title="Link PDF"><FileType size={18}/></button>
                                <button type="button" onClick={() => handleAddFile('doc')} className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors" title="Link Word"><FileText size={18}/></button>
                                <button type="button" onClick={() => handleAddFile('excel')} className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors" title="Link Excel"><FileSpreadsheet size={18}/></button>
                            </div>
                            
                            {formData.dinh_kem && formData.dinh_kem.length > 0 ? (
                                <div className="space-y-2">
                                    {formData.dinh_kem.map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 group">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                {file.loai === 'pdf' ? <FileType size={16} className="text-red-500 shrink-0"/> : file.loai === 'excel' ? <FileSpreadsheet size={16} className="text-emerald-500 shrink-0"/> : <FileText size={16} className="text-blue-500 shrink-0"/>}
                                                <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary hover:underline truncate">{file.ten_file}</a>
                                            </div>
                                            <button type="button" onClick={() => removeFile(file.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16}/></button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-lg bg-gray-50/50 dark:bg-slate-800/50">
                                    <p className="text-xs text-gray-400">Chưa có tài liệu đính kèm</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: CONTROL PANEL (4/12) */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
                
                {/* 1. System Code (Card) */}
                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-5 rounded-xl shadow-md border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Hash size={64}/></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã tài liệu (Code)</label>
                            {isCodeLocked ? <Lock size={12} className="text-slate-500"/> : <Unlock size={12} className="text-yellow-500"/>}
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                            <input 
                                name="ma_tai_lieu" 
                                className="bg-transparent border-b border-slate-600 w-full text-xl font-mono font-bold text-white focus:outline-none focus:border-blue-400 placeholder:text-slate-600 pb-1"
                                value={formData.ma_tai_lieu} 
                                onChange={handleChange} 
                                readOnly={isCodeLocked} 
                                placeholder="QT-..." 
                            />
                            <button type="button" onClick={() => setIsCodeLocked(!isCodeLocked)} className="text-slate-400 hover:text-white transition-colors" title="Toggle Auto-Code">
                                <RefreshCw size={14}/>
                            </button>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
                            <span className="text-[10px] text-slate-400">Thứ tự hiển thị:</span>
                            <div className="flex items-center bg-slate-700/50 rounded px-1">
                                <button type="button" onClick={() => adjustNumber('thu_tu', -1)} className="p-1 hover:text-white text-slate-400"><Minus size={10}/></button>
                                <span className="text-xs font-mono font-bold w-6 text-center">{formData.thu_tu}</span>
                                <button type="button" onClick={() => adjustNumber('thu_tu', 1)} className="p-1 hover:text-white text-slate-400"><Plus size={10}/></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Versioning & Cycle */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                    <div className={cardHeaderClass}>
                        <GitCommit size={16} className="text-purple-500"/> Phiên bản & Hiệu lực
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Version</label>
                                <div className="relative">
                                    <input className={`${inputClass} font-mono font-bold pl-8`} value={formData.phien_ban} onChange={handleChange} name="phien_ban" placeholder="1.0" />
                                    <span className="absolute left-3 top-2.5 text-gray-400 text-xs font-bold">v</span>
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>Lần BH</label>
                                <CompactCounter value={formData.lan_ban_hanh || 1} onChange={(val) => adjustNumber('lan_ban_hanh', val)} min={1} />
                            </div>
                        </div>

                        <div>
                            <label className={labelClass}>Ngày Ban hành &rarr; Hiệu lực</label>
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700">
                                <input type="date" name="ngay_ban_hanh" className="bg-transparent border-none outline-none text-xs font-medium text-gray-600 dark:text-gray-300 w-full px-2 text-center dark:[color-scheme:dark]" value={formData.ngay_ban_hanh} onChange={handleChange}/>
                                <ArrowRight size={12} className="text-gray-400"/>
                                <input type="date" name="ngay_hieu_luc" className="bg-transparent border-none outline-none text-xs font-bold text-blue-600 dark:text-blue-400 w-full px-2 text-center dark:[color-scheme:dark]" value={formData.ngay_hieu_luc} onChange={handleChange}/>
                            </div>
                        </div>

                        <div className={`p-3 rounded-lg border transition-all ${isReviewEnabled ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900/30' : 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 cursor-pointer" onClick={toggleReview}>
                                    <RefreshCw size={10} className={isReviewEnabled ? "text-orange-500 animate-spin-slow" : ""}/> Định kỳ rà soát
                                </label>
                                <div onClick={toggleReview} className={`w-8 h-4 rounded-full p-0.5 cursor-pointer transition-colors ${isReviewEnabled ? 'bg-orange-500' : 'bg-gray-300 dark:bg-slate-600'}`}><div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isReviewEnabled ? 'translate-x-4' : ''}`}></div></div>
                            </div>
                            {isReviewEnabled ? (
                                <div className="flex items-center gap-2">
                                    <CompactCounter value={formData.chu_ky_ra_soat || 12} onChange={(val) => adjustNumber('chu_ky_ra_soat', val === 1 ? 6 : -6)} min={6} className="w-24 bg-white dark:bg-slate-900 h-7" />
                                    <span className="text-xs font-medium text-orange-700 dark:text-orange-400">Tháng / lần</span>
                                </div>
                            ) : <span className="text-[10px] text-gray-400 italic">Không áp dụng</span>}
                        </div>
                    </div>
                </div>

                {/* 3. Responsibility & Context */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm">
                    <div className={cardHeaderClass}>
                        <User size={16} className="text-green-500"/> Trách nhiệm & Bối cảnh
                    </div>
                    <div className="space-y-3">
                        <div><label className={labelClass}>Người soạn thảo</label><SearchableSelect options={drafterOptions} value={formData.nguoi_soan_thao} onChange={(val) => handleSelectChange('nguoi_soan_thao', String(val))} placeholder="-- Chọn --" className="h-8 text-xs"/></div>
                        <div><label className={labelClass}>Người xem xét</label><SearchableSelect options={reviewerOptions} value={formData.nguoi_xem_xet} onChange={(val) => handleSelectChange('nguoi_xem_xet', String(val))} placeholder="-- Chọn --" className="h-8 text-xs"/></div>
                        <div><label className={labelClass}>Người phê duyệt</label><SearchableSelect options={approverOptions} value={formData.nguoi_phe_duyet} onChange={(val) => handleSelectChange('nguoi_phe_duyet', String(val))} placeholder="-- Chọn --" className="h-8 text-xs"/></div>
                        
                        <div className="pt-3 border-t border-gray-100 dark:border-slate-800 mt-2">
                            <label className={labelClass}>Lĩnh vực</label>
                            <SearchableSelect options={linhVucOptions} value={formData.id_linh_vuc} onChange={(val) => handleSelectChange('id_linh_vuc', String(val))} placeholder="-- Chọn lĩnh vực --" className="h-8 text-xs"/>
                        </div>
                        <div>
                            <label className={labelClass}>Tiêu chuẩn áp dụng</label>
                            <MultiSelect 
                                options={tieuChuanOptions}
                                value={formData.id_tieu_chuan || []}
                                onValueChange={(val) => setFormData(prev => ({...prev, id_tieu_chuan: val}))}
                                placeholder="Chọn tiêu chuẩn..."
                                className="text-xs"
                            />
                        </div>
                    </div>
                </div>

            </div>
        </div>
      </form>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
         <div className="text-xs text-gray-400 italic hidden md:block flex items-center gap-1">
            <AlertCircle size={12}/> Các trường có dấu <span className="text-red-500">*</span> là bắt buộc.
         </div>
         <div className="flex gap-3 ml-auto">
            <Button variant="ghost" onClick={onCancel}>Hủy bỏ</Button>
            <Button onClick={() => handleSubmit()} leftIcon={<Save size={16}/>}>Lưu tài liệu</Button>
         </div>
      </div>
    </div>
  );
};
