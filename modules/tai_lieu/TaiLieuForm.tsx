
import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { TaiLieu, TrangThaiTaiLieu, MasterDataState, DinhKem, NhanSu } from '../../types';
import { Button } from '../../components/ui/Button';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { Save, Paperclip, X, FileText, FileType, FileSpreadsheet, File, Lock, Unlock, Link as LinkIcon, Trash2, Layers, Briefcase, User } from 'lucide-react';
import { format } from 'date-fns';
import { useDialog } from '../../contexts/DialogContext';

// --- VALIDATION SCHEMA ---
const taiLieuSchema = z.object({
  ma_tai_lieu: z.string().min(1, "Mã tài liệu không được để trống"),
  ten_tai_lieu: z.string().min(1, "Tên tài liệu không được để trống"),
  loai_tai_lieu: z.string().min(1, "Vui lòng chọn loại tài liệu"),
  linh_vuc: z.string().optional(),
  phien_ban: z.string().default('1.0'),
  lan_ban_hanh: z.number().min(0).default(1),
  ngay_ban_hanh: z.string().optional(),
  ngay_hieu_luc: z.string().optional(),
  chu_ky_ra_soat: z.number().min(0).optional(),
  
  tai_lieu_cha_id: z.string().optional(),
  
  id_nguoi_soan_thao: z.string().min(1, "Chọn người soạn thảo"),
  id_nguoi_xem_xet: z.string().optional(),
  id_nguoi_phe_duyet: z.string().optional(),
  
  mo_ta_tom_tat: z.string().optional(),
  tieu_chuan: z.array(z.string()).optional(),
  dinh_kem: z.array(z.any()).optional(),
  trang_thai: z.string().default(TrangThaiTaiLieu.SOAN_THAO)
});

type TaiLieuFormData = z.infer<typeof taiLieuSchema>;

interface TaiLieuFormProps {
  initialData?: TaiLieu | null;
  onSave: (data: Partial<TaiLieu>) => void;
  onCancel: () => void;
  masterData: MasterDataState;
  fullList?: TaiLieu[];
}

export const TaiLieuForm: React.FC<TaiLieuFormProps> = ({ 
  initialData, onSave, onCancel, masterData, fullList = [] 
}) => {
  const dialog = useDialog();
  const [isCodeLocked, setIsCodeLocked] = useState(!initialData); // Auto-lock for new
  const [urlInput, setUrlInput] = useState('');

  // --- REACT HOOK FORM SETUP ---
  const { 
    register, 
    control, 
    handleSubmit, 
    watch, 
    setValue, 
    formState: { errors, isSubmitting } 
  } = useForm<TaiLieuFormData>({
    resolver: zodResolver(taiLieuSchema),
    defaultValues: initialData || {
      ma_tai_lieu: '',
      ten_tai_lieu: '',
      phien_ban: '1.0',
      lan_ban_hanh: 1,
      chu_ky_ra_soat: 0,
      tieu_chuan: [],
      dinh_kem: [],
      trang_thai: TrangThaiTaiLieu.SOAN_THAO
    }
  });

  const watchedLoai = watch('loai_tai_lieu');
  const watchedParent = watch('tai_lieu_cha_id');
  const watchedFiles = watch('dinh_kem') || [];
  const watchedTieuChuan = watch('tieu_chuan') || [];

  // --- AUTO-GEN CODE LOGIC ---
  useEffect(() => {
    if (initialData || !isCodeLocked) return;
    if (!watchedLoai) return;

    const docTypeConfig = masterData.loaiTaiLieu.find(t => t.ten === watchedLoai);
    if (!docTypeConfig) return;

    const prefix = docTypeConfig.ma_viet_tat || '';
    const separator = docTypeConfig.ky_tu_noi || '.';
    const digitCount = docTypeConfig.do_dai_so || 2;

    let newCode = `${prefix}01`; // Fallback simple

    if (watchedParent) {
        const parentDoc = fullList.find(d => d.id === watchedParent);
        if (parentDoc) {
           const siblings = fullList.filter(d => 
              d.tai_lieu_cha_id === parentDoc.id && 
              d.loai_tai_lieu === watchedLoai
           );
           const nextNum = siblings.length + 1;
           const paddedNum = String(nextNum).padStart(digitCount, '0');
           newCode = `${parentDoc.ma_tai_lieu}${separator}${prefix}${paddedNum}`;
        }
    }
    
    // Only update if changed to avoid loop
    const currentCode = watch('ma_tai_lieu');
    if (newCode !== currentCode) {
        setValue('ma_tai_lieu', newCode);
    }
  }, [watchedLoai, watchedParent, isCodeLocked, masterData]);

  // --- HANDLERS ---
  
  const handleFormSubmit = (data: TaiLieuFormData) => {
    // Clean up empty optional fields if needed
    const cleanData = { ...data };
    if (!cleanData.ngay_ban_hanh) delete cleanData.ngay_ban_hanh;
    if (!cleanData.ngay_hieu_luc) delete cleanData.ngay_hieu_luc;
    
    // Merge ID if existing
    const payload = {
        ...cleanData,
        id: initialData?.id,
        // Re-attach logic data that might be computed outside
        ngay_ra_soat_tiep_theo: initialData?.ngay_ra_soat_tiep_theo // Simplification
    };
    
    onSave(payload as any);
  };

  const handleAddFile = (type: 'pdf' | 'doc' | 'excel' | 'link') => {
    if (!urlInput.trim()) {
        dialog.alert("Vui lòng nhập đường dẫn URL file!", { type: 'warning' });
        return;
    }
    
    // Simple mock file object
    const newFile: DinhKem = {
        id: `f${Date.now()}`,
        ten_file: urlInput.split('/').pop() || 'File mới',
        url: urlInput,
        loai: type,
        ngay_upload: new Date().toISOString()
    };

    setValue('dinh_kem', [...watchedFiles, newFile]);
    setUrlInput('');
  };

  const removeFile = (id: string) => {
      setValue('dinh_kem', watchedFiles.filter((f: DinhKem) => f.id !== id));
  };

  const toggleTieuChuan = (tc: string) => {
      if (watchedTieuChuan.includes(tc)) {
          setValue('tieu_chuan', watchedTieuChuan.filter(t => t !== tc));
      } else {
          setValue('tieu_chuan', [...watchedTieuChuan, tc]);
      }
  };

  // --- OPTIONS ---
  const parentOptions = fullList.filter(d => d.id !== initialData?.id).map(d => ({ value: d.id, label: d.ten_tai_lieu, subLabel: d.ma_tai_lieu }));
  const loaiOptions = masterData.loaiTaiLieu.map(i => ({ value: i.ten, label: i.ten }));
  const linhVucOptions = masterData.linhVuc.map(i => ({ value: i.ten, label: i.ten }));
  
  const mapUser = (u: NhanSu) => ({ value: u.id, label: u.ho_ten, subLabel: u.chuc_vu });
  const userOptions = masterData.nhanSu.map(mapUser);

  // --- STYLES ---
  const inputClass = "w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm";
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide";
  const errorClass = "text-[11px] text-red-500 mt-1 font-medium";

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 overflow-hidden">
        {/* Header - Simple & Clean */}
        <div className="shrink-0 px-6 py-4 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center sticky top-0 z-20">
            <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-blue-600" />
                    {initialData ? 'Cập nhật tài liệu' : 'Soạn thảo mới'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Nhập thông tin chi tiết bên dưới</p>
            </div>
            <div className="flex gap-2">
                <Button variant="ghost" onClick={onCancel} type="button">Đóng</Button>
                <Button onClick={handleSubmit(handleFormSubmit)} disabled={isSubmitting} leftIcon={<Save size={16}/>}>
                    {isSubmitting ? 'Đang lưu...' : 'Lưu lại'}
                </Button>
            </div>
        </div>

        {/* Content - Centered Card Style */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-800 p-6 md:p-8 space-y-8">
                
                {/* 1. Định danh */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center"><Layers size={14}/></div>
                        Thông tin định danh
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <label className={labelClass}>Tên tài liệu <span className="text-red-500">*</span></label>
                            <input {...register('ten_tai_lieu')} className={inputClass} placeholder="VD: Quy trình kiểm soát chất lượng..." autoFocus />
                            {errors.ten_tai_lieu && <p className={errorClass}>{errors.ten_tai_lieu.message}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Loại tài liệu <span className="text-red-500">*</span></label>
                            <Controller
                                name="loai_tai_lieu"
                                control={control}
                                render={({ field }) => (
                                    <SearchableSelect 
                                        options={loaiOptions} 
                                        value={field.value} 
                                        onChange={(val) => field.onChange(val)} 
                                        placeholder="Chọn loại..."
                                    />
                                )}
                            />
                            {errors.loai_tai_lieu && <p className={errorClass}>{errors.loai_tai_lieu.message}</p>}
                        </div>

                        <div>
                            <label className={labelClass}>Mã tài liệu <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input 
                                    {...register('ma_tai_lieu')} 
                                    className={`${inputClass} pr-10 font-mono font-bold text-blue-700 dark:text-blue-400 ${isCodeLocked ? 'bg-gray-50 dark:bg-slate-800' : ''}`} 
                                    readOnly={isCodeLocked}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setIsCodeLocked(!isCodeLocked)} 
                                    className="absolute right-2 top-2 text-gray-400 hover:text-blue-500 transition-colors p-1"
                                >
                                    {isCodeLocked ? <Lock size={14}/> : <Unlock size={14}/>}
                                </button>
                            </div>
                            {errors.ma_tai_lieu && <p className={errorClass}>{errors.ma_tai_lieu.message}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className={labelClass}>Tài liệu cha (Nếu có)</label>
                            <Controller
                                name="tai_lieu_cha_id"
                                control={control}
                                render={({ field }) => (
                                    <SearchableSelect 
                                        options={parentOptions} 
                                        value={field.value} 
                                        onChange={(val) => field.onChange(val)} 
                                        placeholder="-- Chọn tài liệu gốc --"
                                    />
                                )}
                            />
                        </div>
                    </div>
                </div>

                {/* 2. Nội dung & Phân loại */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center"><Briefcase size={14}/></div>
                        Nội dung & Phân loại
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className={labelClass}>Lĩnh vực</label>
                            <Controller
                                name="linh_vuc"
                                control={control}
                                render={({ field }) => (
                                    <SearchableSelect options={linhVucOptions} value={field.value} onChange={field.onChange} placeholder="Chọn lĩnh vực..." />
                                )}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Tiêu chuẩn áp dụng</label>
                            <div className="flex flex-wrap gap-2">
                                {masterData.tieuChuan.map(tc => (
                                    <button
                                        key={tc.id}
                                        type="button"
                                        onClick={() => toggleTieuChuan(tc.ten)}
                                        className={`px-2 py-1 rounded text-xs border transition-all ${watchedTieuChuan.includes(tc.ten) ? 'bg-blue-100 border-blue-200 text-blue-700 font-bold' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        {tc.ten}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className={labelClass}>Mô tả tóm tắt</label>
                            <textarea {...register('mo_ta_tom_tat')} className="w-full p-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm min-h-[80px]" placeholder="Phạm vi áp dụng, mục đích..." />
                        </div>
                    </div>
                </div>

                {/* 3. Trách nhiệm */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center"><User size={14}/></div>
                        Phân công trách nhiệm
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Soạn thảo <span className="text-red-500">*</span></label>
                            <Controller name="id_nguoi_soan_thao" control={control} render={({field}) => <SearchableSelect options={userOptions} value={field.value} onChange={field.onChange} />} />
                            {errors.id_nguoi_soan_thao && <p className={errorClass}>{errors.id_nguoi_soan_thao.message}</p>}
                        </div>
                        <div>
                            <label className={labelClass}>Xem xét</label>
                            <Controller name="id_nguoi_xem_xet" control={control} render={({field}) => <SearchableSelect options={userOptions} value={field.value} onChange={field.onChange} />} />
                        </div>
                        <div>
                            <label className={labelClass}>Phê duyệt</label>
                            <Controller name="id_nguoi_phe_duyet" control={control} render={({field}) => <SearchableSelect options={userOptions} value={field.value} onChange={field.onChange} />} />
                        </div>
                    </div>
                </div>

                {/* 4. File đính kèm */}
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        <Paperclip size={16} className="text-gray-500"/>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">File đính kèm</span>
                    </div>
                    
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                            <LinkIcon size={14} className="absolute left-3 top-3 text-gray-400"/>
                            <input 
                                value={urlInput} 
                                onChange={(e) => setUrlInput(e.target.value)} 
                                className="w-full h-9 pl-9 pr-3 rounded-lg border border-gray-300 dark:border-slate-600 text-sm focus:ring-1 focus:ring-blue-500" 
                                placeholder="Paste link file..." 
                            />
                        </div>
                        <Button size="sm" variant="outline" type="button" onClick={() => handleAddFile('pdf')} className="text-xs h-9">PDF</Button>
                        <Button size="sm" variant="outline" type="button" onClick={() => handleAddFile('doc')} className="text-xs h-9">Word</Button>
                        <Button size="sm" variant="outline" type="button" onClick={() => handleAddFile('excel')} className="text-xs h-9">Excel</Button>
                    </div>

                    <div className="space-y-2">
                        {watchedFiles.map((file: DinhKem) => (
                            <div key={file.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-700">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    {file.loai === 'pdf' ? <FileType size={16} className="text-red-500"/> : file.loai === 'excel' ? <FileSpreadsheet size={16} className="text-green-500"/> : <FileText size={16} className="text-blue-500"/>}
                                    <span className="text-sm truncate max-w-[200px]">{file.ten_file}</span>
                                </div>
                                <button type="button" onClick={() => removeFile(file.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        ))}
                        {watchedFiles.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Chưa có file nào</p>}
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
};
