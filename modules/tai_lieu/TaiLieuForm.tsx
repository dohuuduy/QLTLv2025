
import React, { useState, useEffect } from 'react';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Save, Info, Calendar, UserCheck, FileType, Paperclip, Trash2, Link as LinkIcon, FileText, FileSpreadsheet, File, RefreshCw, Lock, Unlock, Layers, Tag, ArrowRight, GitCommit } from 'lucide-react';
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

  // Auto-gen code logic (Keep existing logic)
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
        } catch (e) {}
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
      setFormData(prev => ({ ...prev, tieu_chuan: currentList.filter(item => item !== tieuChuanName) }));
    } else {
      setFormData(prev => ({ ...prev, tieu_chuan: [...currentList, tieuChuanName] }));
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
      dialog.alert("Vui lòng dán đường dẫn (Link) vào ô trống!", { type: 'warning' });
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
      case 'pdf': return { icon: <FileType size={20} strokeWidth={1.5} />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' };
      case 'doc': return { icon: <FileText size={20} strokeWidth={1.5} />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'excel': return { icon: <FileSpreadsheet size={20} strokeWidth={1.5} />, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' };
      case 'link': return { icon: <LinkIcon size={20} strokeWidth={1.5} />, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' };
      default: return { icon: <File size={20} strokeWidth={1.5} />, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' };
    }
  };

  const loaiTaiLieuOptions = masterData.loaiTaiLieu.map(i => ({ value: i.ten, label: i.ten }));
  const linhVucOptions = masterData.linhVuc.map(i => ({ value: i.ten, label: i.ten }));
  
  const mapUserToOption = (u: NhanSu) => ({ value: u.id, label: u.ho_ten, subLabel: u.chuc_vu });
  const drafterOptions = masterData.nhanSu.filter(u => u.roles.includes('SOAN_THAO') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);
  const reviewerOptions = masterData.nhanSu.filter(u => u.roles.includes('XEM_XET') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);
  const approverOptions = masterData.nhanSu.filter(u => u.roles.includes('PHE_DUYET') || u.roles.includes('QUAN_TRI')).map(mapUserToOption);

  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-400 text-sm";
  const textareaClass = "w-full p-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-gray-400 text-sm";
  const labelClass = "text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1.5 flex items-center gap-1.5";
  
  const Section = ({ title, icon: Icon, children, className = "" }: any) => (
      <div className={`bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm ${className}`}>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-5 flex items-center gap-2 border-b border-gray-100 dark:border-slate-800/50 pb-3">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Icon size={18} />
              </div>
              {title}
          </h3>
          {children}
      </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50/50 dark:bg-slate-950">
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 md:px-8 md:py-4 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0 shadow-sm">
        <div className="flex flex-col min-w-0 flex-1 w-full sm:w-auto">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate pr-2 flex items-center gap-2">
                {initialData ? <span className="text-blue-600"><FileText size={24}/></span> : <span className="text-green-600"><Layers size={24}/></span>}
                {initialData ? 'Cập nhật tài liệu' : 'Soạn thảo tài liệu mới'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
               {initialData ? `Đang chỉnh sửa: ${initialData.ma_tai_lieu} - v${initialData.phien_ban}` : 'Điền thông tin bên dưới để khởi tạo quy trình ISO mới'}
            </p>
        </div>
        <div className="flex gap-3 shrink-0 w-full sm:w-auto justify-end">
            <Button variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none justify-center">Hủy bỏ</Button>
            <Button onClick={handleSubmit} leftIcon={<Save size={18} />} className="flex-1 sm:flex-none justify-center bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">Lưu lại</Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            
            {/* LEFT COLUMN (66%) */}
            <div className="lg:col-span-2 space-y-8">
                
                {/* 1. Basic Info */}
                <Section title="Thông tin định danh" icon={Info}>
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                            <div className="md:col-span-8">
                                <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
                                <input required name="ten_tai_lieu" value={formData.ten_tai_lieu} onChange={handleChange} className={inputClass} placeholder="VD: Quy trình kiểm soát chất lượng..." autoFocus />
                            </div>
                            <div className="md:col-span-4">
                                <label className={labelClass}>Mã tài liệu <span className="text-red-500">*</span></label>
                                <div className="relative group">
                                    <input required name="ma_tai_lieu" value={formData.ma_tai_lieu} onChange={handleChange} className={`${inputClass} pr-10 font-mono font-bold text-blue-700 dark:text-blue-400 ${isCodeLocked ? 'bg-gray-50 dark:bg-slate-800 text-gray-500 cursor-not-allowed' : ''}`} placeholder="Auto-gen..." readOnly={isCodeLocked} />
                                    <button type="button" onClick={() => setIsCodeLocked(!isCodeLocked)} className="absolute right-2 top-2 p-1 text-gray-400 hover:text-blue-500 transition-colors rounded hover:bg-gray-100 dark:hover:bg-slate-700" title={isCodeLocked ? "Mở khóa sửa thủ công" : "Khóa để sinh mã tự động"}>
                                        {isCodeLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className={labelClass}>Tài liệu cha (Quy trình mẹ)</label>
                            <SearchableSelect options={availableParents} value={formData.tai_lieu_cha_id} onChange={(val) => handleSelectChange('tai_lieu_cha_id', val)} placeholder="-- Chọn tài liệu gốc (Nếu có) --" />
                        </div>

                        <div>
                            <label className={labelClass}>Mô tả tóm tắt</label>
                            <textarea name="mo_ta_tom_tat" value={formData.mo_ta_tom_tat} onChange={handleChange} className={`${textareaClass} min-h-[100px] resize-y`} placeholder="Mô tả phạm vi áp dụng, mục đích của tài liệu..." />
                        </div>
                    </div>
                </Section>

                {/* 2. Attachments */}
                <Section title="Nội dung & Tệp đính kèm" icon={Paperclip}>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-2 bg-gray-50 dark:bg-slate-900/50 p-3 rounded-xl border border-gray-200 dark:border-slate-700">
                            <div className="flex-1 relative">
                                <LinkIcon size={16} className="absolute left-3 top-3 text-gray-400"/>
                                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none" placeholder="Dán đường dẫn tài liệu (Google Drive, SharePoint...)" />
                            </div>
                            <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                                <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('pdf')} className="border-red-200 text-red-600 hover:bg-red-50"><FileType size={14} className="mr-1"/> PDF</Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('doc')} className="border-blue-200 text-blue-600 hover:bg-blue-50"><FileText size={14} className="mr-1"/> Word</Button>
                                <Button type="button" size="sm" variant="outline" onClick={() => handleAddFile('excel')} className="border-emerald-200 text-emerald-600 hover:bg-emerald-50"><FileSpreadsheet size={14} className="mr-1"/> Excel</Button>
                            </div>
                        </div>

                        {formData.dinh_kem && formData.dinh_kem.length > 0 ? (
                            <div className="grid grid-cols-1 gap-2 mt-2">
                                {formData.dinh_kem.map(file => {
                                    const config = getFileTypeConfig(file.loai);
                                    return (
                                        <div key={file.id} className={`flex items-center gap-4 p-3 rounded-xl border ${config.border} ${config.bg} bg-opacity-30 group hover:bg-opacity-50 transition-all`}>
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white dark:bg-slate-900 shadow-sm ${config.color}`}>{config.icon}</div>
                                            <div className="flex-1 min-w-0">
                                                <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate hover:text-blue-600 block">{file.ten_file}</a>
                                                <div className="text-[10px] text-gray-500 flex gap-2">
                                                    <span>{format(new Date(file.ngay_upload), 'dd/MM/yyyy HH:mm')}</span>
                                                    <span>•</span>
                                                    <span className="uppercase">{file.loai}</span>
                                                </div>
                                            </div>
                                            <button type="button" onClick={() => removeFile(file.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors shadow-sm opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-900/50 text-gray-400">
                                <File size={32} className="mb-2 opacity-50"/>
                                <span className="text-sm">Chưa có file đính kèm</span>
                            </div>
                        )}
                    </div>
                </Section>

                {/* 3. Responsibility - Workflow Style */}
                <Section title="Quy trình & Trách nhiệm" icon={UserCheck}>
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center relative">
                            {/* Workflow Line (Desktop) */}
                            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-gray-100 dark:bg-slate-800 -z-10 -translate-y-1/2"></div>
                            
                            {/* Step 1: Soạn thảo */}
                            <div className="flex-1 w-full bg-white dark:bg-slate-900 border border-blue-100 dark:border-slate-700 p-4 rounded-xl shadow-sm relative group hover:border-blue-300 transition-colors">
                                <div className="absolute -top-3 left-4 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Bước 1: Soạn thảo</div>
                                <div className="mt-2">
                                    <SearchableSelect options={drafterOptions} value={formData.id_nguoi_soan_thao} onChange={(val) => handleSelectChange('id_nguoi_soan_thao', val)} placeholder="Chọn người soạn..." />
                                </div>
                            </div>

                            <ArrowRight className="hidden md:block text-gray-300" size={20}/>

                            {/* Step 2: Xem xét */}
                            <div className="flex-1 w-full bg-white dark:bg-slate-900 border border-purple-100 dark:border-slate-700 p-4 rounded-xl shadow-sm relative group hover:border-purple-300 transition-colors">
                                <div className="absolute -top-3 left-4 bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Bước 2: Xem xét</div>
                                <div className="mt-2">
                                    <SearchableSelect options={reviewerOptions} value={formData.id_nguoi_xem_xet} onChange={(val) => handleSelectChange('id_nguoi_xem_xet', val)} placeholder="Chọn người review..." />
                                </div>
                            </div>

                            <ArrowRight className="hidden md:block text-gray-300" size={20}/>

                            {/* Step 3: Phê duyệt */}
                            <div className="flex-1 w-full bg-white dark:bg-slate-900 border border-green-100 dark:border-slate-700 p-4 rounded-xl shadow-sm relative group hover:border-green-300 transition-colors">
                                <div className="absolute -top-3 left-4 bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Bước 3: Phê duyệt</div>
                                <div className="mt-2">
                                    <SearchableSelect options={approverOptions} value={formData.id_nguoi_phe_duyet} onChange={(val) => handleSelectChange('id_nguoi_phe_duyet', val)} placeholder="Chọn người duyệt..." />
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>
            </div>

            {/* RIGHT COLUMN (33%) */}
            <div className="space-y-8">
                
                {/* 4. Classification */}
                <Section title="Phân loại ISO" icon={Layers}>
                    <div className="space-y-5">
                        <div>
                            <label className={labelClass}>Loại tài liệu</label>
                            <SearchableSelect options={loaiTaiLieuOptions} value={formData.loai_tai_lieu} onChange={(val) => handleSelectChange('loai_tai_lieu', val)} placeholder="-- Chọn loại --" />
                        </div>
                        <div>
                            <label className={labelClass}>Lĩnh vực hoạt động</label>
                            <SearchableSelect options={linhVucOptions} value={formData.linh_vuc} onChange={(val) => handleSelectChange('linh_vuc', val)} placeholder="-- Chọn lĩnh vực --" />
                        </div>
                        <div>
                            <label className={labelClass}><Tag size={12}/> Tiêu chuẩn áp dụng</label>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {masterData.tieuChuan.map(item => {
                                    const isSelected = formData.tieu_chuan?.includes(item.ten);
                                    return (
                                        <button key={item.id} type="button" onClick={() => toggleTieuChuan(item.ten)} className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105' : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:border-blue-300'}`}>
                                            {item.ten}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* 5. Control Info */}
                <Section title="Kiểm soát phiên bản" icon={GitCommit}>
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Phiên bản (Ver)</label>
                                <input name="phien_ban" value={formData.phien_ban} onChange={handleChange} className={`${inputClass} text-center font-mono font-bold`} placeholder="1.0" />
                            </div>
                            <div>
                                <label className={labelClass}>Lần ban hành</label>
                                <input type="number" min="0" name="lan_ban_hanh" value={formData.lan_ban_hanh} onChange={handleChange} className={`${inputClass} text-center`} />
                            </div>
                        </div>
                        
                        <div className="pt-4 border-t border-gray-100 dark:border-slate-800">
                            <label className={labelClass}><Calendar size={12}/> Ngày hiệu lực</label>
                            <input type="date" name="ngay_hieu_luc" value={formData.ngay_hieu_luc} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark]`} />
                        </div>

                        {/* Rà soát Toggle */}
                        <div className={`p-4 rounded-xl border transition-all duration-300 ${isReviewEnabled ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800' : 'bg-gray-50 border-gray-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                            <label className="flex items-center justify-between cursor-pointer mb-3">
                                <span className={`text-sm font-bold flex items-center gap-2 ${isReviewEnabled ? 'text-orange-700 dark:text-orange-400' : 'text-gray-600'}`}><RefreshCw size={16}/> Định kỳ rà soát</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={isReviewEnabled} onChange={toggleReview} />
                                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                                </div>
                            </label>
                            
                            {isReviewEnabled && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                    <div className="flex items-center gap-2">
                                        <input type="number" min="1" name="chu_ky_ra_soat" value={formData.chu_ky_ra_soat || ''} onChange={handleChange} className={`${inputClass} text-center`} />
                                        <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Tháng / lần</span>
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-400 uppercase block mb-1 font-bold">Dự kiến rà soát</label>
                                        <input type="date" name="ngay_ra_soat_tiep_theo" value={formData.ngay_ra_soat_tiep_theo || ''} onChange={handleChange} className={`${inputClass} dark:[color-scheme:dark] bg-white dark:bg-slate-900`} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </Section>

            </div>
        </div>
      </form>
    </div>
  );
};
