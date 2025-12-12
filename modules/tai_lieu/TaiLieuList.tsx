
import React, { useState, useMemo, useEffect } from 'react';
import { DataTable } from '../../components/DataTable';
import { TaiLieu, ColumnDefinition, TrangThaiTaiLieu, MasterDataState, NhanSu, DinhKem, HoSo } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { format, differenceInDays } from 'date-fns';
import { Sparkles, Plus, Pencil, Trash2, X, Calendar, User, FileText, CheckCircle, Filter, Paperclip, Lock, FileType, FileSpreadsheet, Link as LinkIcon, ExternalLink, FileUp, AlertTriangle, ArrowRight, GitCommit, History, RefreshCw, GitBranch, List, ChevronRight, ChevronDown, FolderOpen, Archive, FileBox, Send, Zap, GitMerge, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { TaiLieuForm } from './TaiLieuForm';
import { Modal } from '../../components/ui/Modal';
import { DocumentTimeline } from '../../components/DocumentTimeline';
import { AIChatBox } from '../../components/AIChatBox';
import { upsertDocument, deleteDocument } from '../../services/supabaseService';

interface TaiLieuListProps {
  masterData: MasterDataState;
  currentUser: NhanSu;
  initialFilters?: { trang_thai?: string; bo_phan?: string };
  data: TaiLieu[];
  onUpdate: (newData: TaiLieu[]) => void;
  records: HoSo[];
}

export const TaiLieuList: React.FC<TaiLieuListProps> = ({ masterData, currentUser, initialFilters, data, onUpdate, records }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail' | 'tree'>('list'); 
  const [selectedDoc, setSelectedDoc] = useState<TaiLieu | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set()); 

  // State Filter
  const [filterLoai, setFilterLoai] = useState<string>('');
  const [filterLinhVuc, setFilterLinhVuc] = useState<string>('');
  const [filterTrangThai, setFilterTrangThai] = useState<string>(''); 
  const [filterBoPhan, setFilterBoPhan] = useState<string>(''); 
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialFilters) {
      if (initialFilters.trang_thai !== undefined) setFilterTrangThai(initialFilters.trang_thai);
      if (initialFilters.bo_phan !== undefined) setFilterBoPhan(initialFilters.bo_phan);
    }
  }, [initialFilters]);

  // State Version Up
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionType, setVersionType] = useState<'minor' | 'major'>('minor');
  const [versionReason, setVersionReason] = useState('');

  const getRelatedRecords = (docCode: string): HoSo[] => {
      return records.filter(h => h.ma_tai_lieu_lien_quan === docCode);
  };

  const handleAddNew = () => {
    setSelectedDoc(null);
    setViewMode('form');
  };

  const handleEdit = (item: TaiLieu, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDoc(item);
    setViewMode('form');
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Đại ca có chắc muốn xóa tài liệu này không? Hành động này cũng sẽ xóa trên Database.')) {
      try {
        await deleteDocument(id); // API Call
        onUpdate(data.filter(item => item.id !== id)); // Optimistic Update
        if (selectedDoc?.id === id) {
            setSelectedDoc(null);
            setViewMode('list');
        }
      } catch (error) {
        alert("Lỗi khi xóa tài liệu. Vui lòng thử lại!");
      }
    }
  };

  // --- Logic Gửi Duyệt (New) ---
  const handleSendRequest = async () => {
    if (!selectedDoc) return;
    
    // Validate người xem xét/phê duyệt
    if (!selectedDoc.nguoi_xem_xet && !selectedDoc.nguoi_phe_duyet) {
        alert("Tài liệu chưa có người xem xét hoặc phê duyệt. Vui lòng chỉnh sửa và chỉ định nhân sự chịu trách nhiệm trước khi gửi.");
        return;
    }

    if (!window.confirm(`Xác nhận gửi duyệt tài liệu "${selectedDoc.ma_tai_lieu}"?`)) return;

    setIsLoading(true);
    const now = new Date().toISOString();
    
    const updatedDoc: TaiLieu = {
        ...selectedDoc,
        trang_thai: TrangThaiTaiLieu.CHO_DUYET, // Chuyển sang chờ duyệt
        ngay_cap_nhat_cuoi: now,
        lich_su: [
            ...(selectedDoc.lich_su || []),
            {
                id: `H${Date.now()}`,
                nguoi_thuc_hien: currentUser.ho_ten,
                hanh_dong: 'GUI_DUYET',
                thoi_gian: now,
                ghi_chu: 'Gửi yêu cầu phê duyệt',
                trang_thai_cu: selectedDoc.trang_thai,
                trang_thai_moi: TrangThaiTaiLieu.CHO_DUYET
            }
        ]
    };

    try {
        await upsertDocument(updatedDoc);
        onUpdate(data.map(d => d.id === selectedDoc.id ? updatedDoc : d));
        setSelectedDoc(updatedDoc); // Cập nhật UI modal hiện tại
        alert("Đã gửi duyệt thành công! Tài liệu đã chuyển sang trạng thái 'Chờ duyệt'.");
    } catch (e) {
        alert("Lỗi khi gửi duyệt. Vui lòng thử lại.");
    } finally {
        setIsLoading(false);
    }
  };

  // --- Tree View Logic ---
  const toggleNode = (id: string) => {
      const newExpanded = new Set(expandedNodes);
      if (newExpanded.has(id)) {
          newExpanded.delete(id);
      } else {
          newExpanded.add(id);
      }
      setExpandedNodes(newExpanded);
  };

  const buildTree = (docs: TaiLieu[]) => {
      const map: Record<string, TaiLieu & { children: any[] }> = {};
      const roots: any[] = [];
      docs.forEach(d => { map[d.id] = { ...d, children: [] }; });
      docs.forEach(d => {
          if (d.tai_lieu_cha_id && map[d.tai_lieu_cha_id]) {
              map[d.tai_lieu_cha_id].children.push(map[d.id]);
          } else {
              roots.push(map[d.id]);
          }
      });
      return roots;
  };

  const getNextVersion = (currentVer: string, type: 'minor' | 'major') => {
    const parts = currentVer.split('.');
    const major = parseInt(parts[0]) || 1;
    const minor = parseInt(parts[1]) || 0;
    return type === 'major' ? `${major + 1}.0` : `${major}.${minor + 1}`;
  };

  const handleVersionUpClick = () => {
    if (!selectedDoc) return;
    setVersionType('minor');
    setVersionReason('');
    setShowVersionModal(true);
  };

  const confirmVersionUp = async () => {
    if (!selectedDoc) return;
    if (!versionReason.trim()) {
      alert("Vui lòng nhập lý do nâng cấp!");
      return;
    }

    const now = new Date().toISOString();
    const nextVer = getNextVersion(selectedDoc.phien_ban, versionType);
    const nextLanBanHanh = versionType === 'major' ? (selectedDoc.lan_ban_hanh || 0) + 1 : (selectedDoc.lan_ban_hanh || 0);

    // 1. New Doc
    const newDoc: TaiLieu = {
      ...selectedDoc,
      id: `TL${Date.now()}`,
      phien_ban: nextVer,
      lan_ban_hanh: nextLanBanHanh,
      trang_thai: TrangThaiTaiLieu.SOAN_THAO,
      ngay_ban_hanh: '', 
      ngay_hieu_luc: '', 
      nguoi_soan_thao: currentUser.ho_ten,
      nguoi_xem_xet: '',
      nguoi_phe_duyet: '',
      ngay_tao: now,
      nguoi_tao: currentUser.ho_ten,
      ngay_cap_nhat_cuoi: now,
      nguoi_cap_nhat_cuoi: currentUser.ho_ten,
      mo_ta_tom_tat: `[Cập nhật Ver ${nextVer}]: ${versionReason}`,
      lich_su: [{ id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'TAO_MOI', thoi_gian: now, ghi_chu: `Nâng cấp từ phiên bản ${selectedDoc.phien_ban}` }]
    };

    // 2. Old Doc Update
    const oldDocUpdated = {
        ...selectedDoc,
        trang_thai: TrangThaiTaiLieu.HET_HIEU_LUC,
        nguoi_cap_nhat_cuoi: `System (Upgrade to ${nextVer})`,
        ngay_cap_nhat_cuoi: now
    };

    try {
        await upsertDocument(oldDocUpdated); // Update old
        await upsertDocument(newDoc); // Create new
        
        const temp = data.map(d => d.id === selectedDoc.id ? oldDocUpdated : d);
        onUpdate([newDoc, ...temp]);

        setShowVersionModal(false);
        setSelectedDoc(newDoc);
        setViewMode('form');
    } catch (error) {
        alert("Lỗi khi nâng cấp phiên bản!");
    }
  };

  const handleSave = async (formData: Partial<TaiLieu>) => {
    const now = new Date().toISOString();
    setIsLoading(true);
    
    try {
        if (selectedDoc) {
          // Update
          const updatedDoc: TaiLieu = {
              ...selectedDoc,
              ...formData,
              ngay_cap_nhat_cuoi: now,
              nguoi_cap_nhat_cuoi: currentUser.ho_ten,
              lich_su: [...(selectedDoc.lich_su || []), { id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'CAP_NHAT', thoi_gian: now, ghi_chu: 'Cập nhật thông tin' }]
          } as TaiLieu;

          await upsertDocument(updatedDoc); // API
          onUpdate(data.map(item => item.id === selectedDoc.id ? updatedDoc : item));
        } else {
          // Create
          const newDoc: TaiLieu = {
            ...formData,
            id: formData.id || `TL${Date.now()}`, // Ensure ID exists
            ngay_tao: now,
            nguoi_tao: currentUser.ho_ten,
            ngay_cap_nhat_cuoi: now,
            nguoi_cap_nhat_cuoi: currentUser.ho_ten,
            lan_ban_hanh: formData.lan_ban_hanh || 1,
            phien_ban: formData.phien_ban || '1.0',
            trang_thai: formData.trang_thai || TrangThaiTaiLieu.SOAN_THAO,
            lich_su: [{ id: `H${Date.now()}`, nguoi_thuc_hien: currentUser.ho_ten, hanh_dong: 'TAO_MOI', thoi_gian: now, ghi_chu: 'Khởi tạo tài liệu mới' }]
          } as TaiLieu;

          await upsertDocument(newDoc); // API
          onUpdate([newDoc, ...data]);
        }
        setViewMode('list');
        setSelectedDoc(null);
    } catch (error) {
        alert("Lỗi khi lưu tài liệu. Kiểm tra kết nối!");
    } finally {
        setIsLoading(false);
    }
  };

  const handleViewDetail = (item: TaiLieu) => {
    setSelectedDoc(item);
    setViewMode('detail');
  };

  const handleOpenFile = (file: DinhKem, e: React.MouseEvent) => {
    e.stopPropagation();
    let finalUrl = file.url;
    if (finalUrl.includes('drive.google.com') && finalUrl.includes('/view')) {
        finalUrl = finalUrl.replace('/view', '/preview');
    }
    window.open(finalUrl, '_blank');
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return <FileType size={14} className="text-red-500" />;
      case 'doc': return <FileText size={14} className="text-blue-500" />;
      case 'excel': return <FileSpreadsheet size={14} className="text-green-500" />;
      case 'image': return <FileType size={14} className="text-purple-500" />;
      default: return <LinkIcon size={14} className="text-gray-500" />;
    }
  };

  const isAdmin = currentUser.roles.includes('QUAN_TRI');

  const getReviewStatus = (doc: TaiLieu) => {
    if (!doc.ngay_ra_soat_tiep_theo) return null;
    const today = new Date();
    const reviewDate = new Date(doc.ngay_ra_soat_tiep_theo);
    const daysLeft = differenceInDays(reviewDate, today);

    if (daysLeft < 0) return { color: 'text-red-500', bg: 'bg-red-50', label: 'Quá hạn rà soát' };
    if (daysLeft < 30) return { color: 'text-orange-500', bg: 'bg-orange-50', label: `Sắp đến hạn (${daysLeft} ngày)` };
    return { color: 'text-gray-500', bg: 'bg-gray-50', label: format(reviewDate, 'dd/MM/yyyy') };
  };

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchLoai = filterLoai ? item.loai_tai_lieu === filterLoai : true;
      const matchLinhVuc = filterLinhVuc ? item.linh_vuc === filterLinhVuc : true;
      const matchTrangThai = filterTrangThai ? item.trang_thai === filterTrangThai : true;
      const matchBoPhan = filterBoPhan ? item.bo_phan_soan_thao === filterBoPhan : true;
      return matchLoai && matchLinhVuc && matchTrangThai && matchBoPhan;
    });
  }, [data, filterLoai, filterLinhVuc, filterTrangThai, filterBoPhan]);

  // Tree View Render (Same as before)
  const renderTreeNodes = (nodes: any[], level = 0) => {
      if (!nodes || nodes.length === 0) return null;
      return nodes.map(node => {
         const hasChildren = node.children && node.children.length > 0;
         const isExpanded = expandedNodes.has(node.id);
         const paddingLeft = level * 24 + 12;

         return (
            <React.Fragment key={node.id}>
                <div 
                  className={`flex items-center gap-2 p-3 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer group ${level > 0 ? 'bg-gray-50/50 dark:bg-slate-900/50' : ''}`}
                  style={{ paddingLeft: `${paddingLeft}px` }}
                  onClick={() => handleViewDetail(node)}
                >
                    <div className={`w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 dark:hover:bg-slate-700 ${hasChildren ? 'text-gray-500' : 'text-transparent'}`} onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}>
                       {hasChildren && (isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>)}
                    </div>
                    <div className="text-blue-500 dark:text-blue-400">
                       {hasChildren ? <FolderOpen size={16}/> : <FileText size={16}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                       <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 px-1 rounded">{node.ma_tai_lieu}</span>
                          <span className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">{node.ten_tai_lieu}</span>
                       </div>
                       <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>Ver: {node.phien_ban}</span><span>•</span><span>{node.loai_tai_lieu}</span>
                       </div>
                    </div>
                    <div className="px-2"><Badge status={node.trang_thai} /></div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" onClick={(e) => handleEdit(node, e)} className="h-8 w-8"><Pencil size={14} className="text-blue-500"/></Button>
                      <Button variant="ghost" size="icon" onClick={(e) => handleDelete(node.id, e)} className="h-8 w-8"><Trash2 size={14} className="text-red-500"/></Button>
                    </div>
                </div>
                {hasChildren && isExpanded && renderTreeNodes(node.children, level + 1)}
            </React.Fragment>
         )
      });
  };

  const columns: ColumnDefinition<TaiLieu>[] = useMemo(() => [
    { key: 'thu_tu', header: 'Thứ tự', visible: true, render: (val) => <span className="text-gray-500 font-mono text-xs">{val || 0}</span> },
    { key: 'ma_tai_lieu', header: 'Mã số', visible: true, render: (val) => <span className="font-mono font-bold text-primary dark:text-blue-400 text-xs md:text-sm">{val}</span> },
    { 
      key: 'ten_tai_lieu', header: 'Tên Tài Liệu', visible: true, 
      render: (val, item) => {
        const pdfFile = item.dinh_kem?.find(f => f.loai === 'pdf');
        return (
          <div className="flex flex-col gap-1">
             <div className="flex items-center justify-between gap-2 group">
                <span className="font-medium text-gray-800 dark:text-gray-100 line-clamp-2" title={String(val)}>{val}</span>
                {pdfFile && (<button onClick={(e) => handleOpenFile(pdfFile, e)} className="shrink-0 w-6 h-6 flex items-center justify-center bg-red-50 text-red-600 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"><FileType size={14} /></button>)}
             </div>
             {item.tai_lieu_cha_id && (<div className="flex items-center gap-1 text-[10px] text-gray-400"><GitBranch size={10} className="scale-y-[-1]" /><span>Con của: {data.find(d => d.id === item.tai_lieu_cha_id)?.ma_tai_lieu || '...'}</span></div>)}
          </div>
        ) 
      }
    },
    { key: 'loai_tai_lieu', header: 'Loại', visible: true, render: (val) => <span className="text-gray-600 dark:text-gray-400 text-xs">{val}</span> },
    { key: 'linh_vuc', header: 'Lĩnh vực', visible: false },
    { key: 'tieu_chuan', header: 'Tiêu chuẩn', visible: true, render: (val) => { if (!val || (Array.isArray(val) && val.length === 0)) return <span className="text-gray-400 text-xs italic">--</span>; if (Array.isArray(val)) { return (<div className="flex flex-col gap-1"><span className="text-xs font-medium text-indigo-700 dark:text-indigo-300 whitespace-nowrap">{val[0]}</span>{val.length > 1 && <span className="text-[10px] text-gray-500">+{val.length - 1} khác</span>}</div>); } return <span className="text-xs font-medium">{val}</span>; } },
    { key: 'phien_ban', header: 'Ver', visible: true, render: (val) => <span className="text-center block text-xs bg-gray-100 dark:bg-slate-700 dark:text-gray-200 rounded px-1 min-w-[30px]">{val}</span> },
    { key: 'trang_thai', header: 'Trạng Thái', visible: true, render: (val) => <Badge status={val} /> },
    { key: 'bo_phan_soan_thao', header: 'Bộ Phận', visible: true },
    { key: 'ngay_hieu_luc', header: 'Hiệu Lực', visible: true, render: (val) => val ? format(new Date(val), 'dd/MM/yyyy') : <span className="text-gray-400 italic">--</span> },
    { key: 'id', header: 'Thao tác', visible: true, render: (_, item) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={(e) => handleEdit(item, e)} title="Sửa tài liệu"><Pencil size={16} className="text-blue-600 dark:text-blue-400" /></Button>
          <Button variant="ghost" size="icon" onClick={(e) => handleDelete(item.id, e)} title="Xóa tài liệu" className="hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 size={16} className="text-red-500 dark:text-red-400" /></Button>
        </div>
      )
    }
  ], [data]); 

  const visibleAttachments = selectedDoc?.dinh_kem?.filter(file => {
    if (file.loai === 'pdf' || file.loai === 'image') return true;
    return isAdmin; 
  });

  const tableFilters = (
    <>
      <div className="flex bg-gray-100 dark:bg-slate-800 rounded p-1 mr-2 border border-gray-200 dark:border-slate-700">
         <button onClick={() => setViewMode('list')} className={`p-1.5 rounded text-xs font-medium transition-all ${viewMode === 'list' || viewMode === 'detail' || viewMode === 'form' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`} title="Xem dạng bảng"><List size={16}/></button>
         <button onClick={() => setViewMode('tree')} className={`p-1.5 rounded text-xs font-medium transition-all ${viewMode === 'tree' ? 'bg-white dark:bg-slate-600 shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`} title="Xem dạng cây phân cấp"><GitBranch size={16}/></button>
      </div>
      <div className="relative w-full sm:w-28">
        <select value={filterTrangThai} onChange={(e) => setFilterTrangThai(e.target.value)} className={`w-full h-9 pl-2 pr-8 rounded border text-xs sm:text-sm focus:ring-1 ring-primary outline-none appearance-none ${filterTrangThai ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'}`}>
          <option value="">Trạng thái...</option>
          <option value={TrangThaiTaiLieu.SOAN_THAO}>Đang soạn thảo</option>
          <option value={TrangThaiTaiLieu.CHO_DUYET}>Chờ duyệt</option>
          <option value={TrangThaiTaiLieu.DA_BAN_HANH}>Đã ban hành</option>
          <option value={TrangThaiTaiLieu.HET_HIEU_LUC}>Hết hiệu lực</option>
        </select>
        <Filter size={14} className={`absolute right-2 top-2.5 pointer-events-none ${filterTrangThai ? 'text-blue-500' : 'text-gray-400'}`}/>
      </div>
      <div className="relative w-full sm:w-28">
        <select value={filterLoai} onChange={(e) => setFilterLoai(e.target.value)} className="w-full h-9 pl-2 pr-8 rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs sm:text-sm focus:ring-1 ring-primary outline-none appearance-none text-gray-700 dark:text-gray-200">
          <option value="">Loại...</option>
          {masterData.loaiTaiLieu.map(t => <option key={t.id} value={t.ten}>{t.ten}</option>)}
        </select>
        <Filter size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none"/>
      </div>
       <div className="relative w-full sm:w-28">
        <select value={filterBoPhan} onChange={(e) => setFilterBoPhan(e.target.value)} className={`w-full h-9 pl-2 pr-8 rounded border text-xs sm:text-sm focus:ring-1 ring-primary outline-none appearance-none ${filterBoPhan ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200'}`}>
          <option value="">Bộ phận...</option>
          {masterData.boPhan.map(t => <option key={t.id} value={t.ten}>{t.ten}</option>)}
        </select>
        <Filter size={14} className={`absolute right-2 top-2.5 pointer-events-none ${filterBoPhan ? 'text-blue-500' : 'text-gray-400'}`}/>
      </div>
      {(filterTrangThai || filterBoPhan || filterLoai || filterLinhVuc) && (<button onClick={() => { setFilterTrangThai(''); setFilterBoPhan(''); setFilterLoai(''); setFilterLinhVuc(''); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Xóa bộ lọc"><X size={16} /></button>)}
    </>
  );

  const tableActions = (
    <Button className="w-full lg:w-auto h-9 text-sm" onClick={handleAddNew} leftIcon={<Plus size={16} />}>Thêm mới</Button>
  );

  return (
    <div className="h-full flex flex-col gap-4 relative">
      <div className="flex-1 overflow-hidden -mx-4 md:mx-0 flex flex-col">
        {viewMode === 'tree' ? (
           <div className="bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800 flex flex-col h-full">
              <div className="p-3 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 rounded-t-lg flex justify-between items-center">
                 <div className="flex items-center gap-3"><h3 className="font-bold text-gray-800 dark:text-gray-100">Cấu trúc cây tài liệu</h3>{tableFilters}</div>
                 {tableActions}
              </div>
              <div className="flex-1 overflow-auto p-2">
                 <div className="flex items-center gap-2 p-3 text-xs font-bold uppercase text-gray-500 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 mb-2 rounded"><span className="w-6"></span><span className="w-6"></span><span className="flex-1">Tài liệu</span><span className="w-24">Trạng thái</span><span className="w-16"></span></div>
                 {renderTreeNodes(buildTree(filteredData))}
                 {filteredData.length === 0 && (<div className="text-center py-10 text-gray-400">Không tìm thấy dữ liệu</div>)}
              </div>
           </div>
        ) : (
           <DataTable title="Danh sách tài liệu" data={filteredData} columns={columns} onRowClick={handleViewDetail} filters={tableFilters} actions={tableActions} />
        )}
      </div>

      {viewMode === 'form' && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setViewMode('list')} />
          <div className="w-full md:max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl relative animate-slide-in-right flex flex-col transition-colors">
            {isLoading && <div className="absolute inset-0 z-50 bg-white/50 dark:bg-black/50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>}
            <TaiLieuForm initialData={selectedDoc} onSave={handleSave} onCancel={() => setViewMode('list')} masterData={masterData} fullList={data} />
          </div>
        </div>
      )}

      {/* Detail View */}
      {viewMode === 'detail' && selectedDoc && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={() => setViewMode('list')} />
          <div className="w-full md:max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl p-0 overflow-y-auto animate-slide-in-right relative transition-colors flex flex-col">
            <div className="flex justify-between items-start p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/50 sticky top-0 z-10 backdrop-blur-md">
              <div>
                 <div className="flex items-center gap-2 mb-2"><Badge status={selectedDoc.trang_thai} /><span className="text-xs font-mono bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded">{selectedDoc.loai_tai_lieu || 'Tài liệu'}</span></div>
                 <h2 className="text-2xl font-bold text-primary dark:text-blue-400 leading-tight">{selectedDoc.ma_tai_lieu}</h2>
                 {selectedDoc.tai_lieu_cha_id && (<div className="flex items-center gap-1 mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded w-fit"><GitBranch size={12} /><span>Thuộc: {data.find(d => d.id === selectedDoc.tai_lieu_cha_id)?.ten_tai_lieu || '...'}</span></div>)}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setViewMode('list')}><X size={20} /></Button>
            </div>

            <div className="p-6 space-y-8 flex-1">
              
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1 block">Tên tài liệu</label>
                <p className="font-semibold text-xl text-gray-900 dark:text-gray-100">{selectedDoc.ten_tai_lieu}</p>
                {selectedDoc.tieu_chuan && Array.isArray(selectedDoc.tieu_chuan) && selectedDoc.tieu_chuan.length > 0 && (<div className="mt-3 flex flex-wrap gap-2">{selectedDoc.tieu_chuan.map((tc, idx) => (<span key={idx} className="inline-block px-2 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-xs rounded font-medium border border-indigo-200 dark:border-indigo-800">{tc}</span>))}</div>)}
                {selectedDoc.mo_ta_tom_tat && (<p className="mt-2 text-sm text-gray-600 dark:text-gray-300 italic bg-gray-50 dark:bg-slate-800 p-3 rounded-lg border border-gray-100 dark:border-slate-700">"{selectedDoc.mo_ta_tom_tat}"</p>)}
              </div>
              <div>
                 <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2"><Archive size={16} className="text-indigo-500"/> Hồ sơ / Bằng chứng quy định</h3>
                 {(() => {
                    const relatedRecords = getRelatedRecords(selectedDoc.ma_tai_lieu);
                    if (relatedRecords.length === 0) return <p className="text-sm text-gray-400 italic">Chưa có hồ sơ nào được liên kết với quy trình này.</p>;
                    return (
                        <div className="space-y-2">
                           {relatedRecords.map(record => (
                               <div key={record.id} className="flex items-center gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                                   <div className="bg-white dark:bg-slate-800 p-2 rounded-lg text-indigo-500 shadow-sm border border-indigo-50 dark:border-slate-700"><FileBox size={16} /></div>
                                   <div className="flex-1 overflow-hidden">
                                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{record.tieu_de}</p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5"><span className="font-mono">{record.ma_ho_so}</span><span>•</span><span>Lưu {record.thoi_gian_luu_tru} tháng</span></p>
                                   </div>
                                   <div className={`w-2 h-2 rounded-full ${record.trang_thai === 'luu_tru' ? 'bg-green-500' : 'bg-orange-500'}`} title={record.trang_thai}></div>
                               </div>
                           ))}
                        </div>
                    );
                 })()}
              </div>
              <AIChatBox document={selectedDoc} />
              <div>
                 <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2"><Paperclip size={16} className="text-gray-500"/> Tài liệu đính kèm</h3>
                 {visibleAttachments && visibleAttachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {visibleAttachments.map(file => {
                        return (
                          <div key={file.id} onClick={(e) => handleOpenFile(file, e)} className="flex flex-col items-center justify-center p-4 rounded-xl bg-gray-50 dark:bg-slate-800 border-2 border-transparent hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-slate-700 transition-all group cursor-pointer text-center gap-2 relative" title={file.ten_file}>
                            <div className="transform group-hover:scale-110 transition-transform duration-200">{getFileIcon(file.loai)}</div>
                            <div className="w-full"><p className="font-medium text-xs text-gray-700 dark:text-gray-300 truncate w-full px-2">{file.ten_file}</p><div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 mt-1 uppercase tracking-wide"><span>Mở link</span> <ExternalLink size={10} /></div></div>
                          </div>
                        );
                      })}
                    </div>
                 ) : (<p className="text-sm text-gray-400 italic">{isAdmin ? 'Không có tài liệu đính kèm.' : 'Không có tài liệu PDF nào.'}</p>)}
               </div>
              <div><h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2"><History size={16} className="text-blue-500"/> Lịch sử hoạt động</h3><DocumentTimeline history={selectedDoc.lich_su || []} /></div>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                <div><label className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase flex items-center gap-1"><FileText size={12}/> Phiên bản</label><p className="text-gray-900 dark:text-white font-mono text-lg">{selectedDoc.phien_ban} <span className="text-xs text-gray-500">(Lần {selectedDoc.lan_ban_hanh})</span></p></div>
                 <div><label className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase flex items-center gap-1"><Calendar size={12}/> Hiệu lực</label><p className="text-gray-900 dark:text-white font-medium">{selectedDoc.ngay_hieu_luc ? format(new Date(selectedDoc.ngay_hieu_luc), 'dd/MM/yyyy') : '---'}</p></div>
                 <div><label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Ngày ban hành</label><p className="text-sm text-gray-800 dark:text-gray-200">{selectedDoc.ngay_ban_hanh ? format(new Date(selectedDoc.ngay_ban_hanh), 'dd/MM/yyyy') : '---'}</p></div>
                 <div><label className="text-xs text-gray-500 dark:text-gray-400 uppercase">Lĩnh vực</label><p className="text-sm text-gray-800 dark:text-gray-200">{selectedDoc.linh_vuc || '---'}</p></div>
                 {selectedDoc.ngay_ra_soat_tiep_theo && (() => { const status = getReviewStatus(selectedDoc); if (!status) return null; return (<div className="col-span-2 mt-2 pt-2 border-t border-gray-200 dark:border-slate-600"><label className="text-xs text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1 mb-1"><RefreshCw size={12} /> Hạn rà soát tiếp theo</label><div className={`text-sm font-bold px-2 py-1 rounded inline-block ${status.color} ${status.bg} dark:bg-opacity-20`}>{status.label}</div></div>) })()}
              </div>
              <div>
                 <h3 className="text-sm font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 mb-4 flex items-center gap-2"><CheckCircle size={16} className="text-green-500"/> Trách nhiệm</h3>
                 <div className="space-y-4">
                    <div className="flex items-start gap-3"><div className="mt-1 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-full"><User size={14} className="text-gray-500"/></div><div><p className="text-xs text-gray-500 dark:text-gray-400">Soạn thảo</p><p className="font-medium text-gray-800 dark:text-gray-200">{selectedDoc.nguoi_soan_thao || '---'}</p><p className="text-xs text-gray-500">{selectedDoc.bo_phan_soan_thao}</p></div></div>
                    <div className="flex items-start gap-3"><div className="mt-1 bg-gray-100 dark:bg-slate-800 p-1.5 rounded-full"><User size={14} className="text-gray-500"/></div><div><p className="text-xs text-gray-500 dark:text-gray-400">Xem xét</p><p className="font-medium text-gray-800 dark:text-gray-200">{selectedDoc.nguoi_xem_xet || '---'}</p></div></div>
                    <div className="flex items-start gap-3"><div className="mt-1 bg-green-100 dark:bg-green-900/30 p-1.5 rounded-full"><CheckCircle size={14} className="text-green-600 dark:text-green-400"/></div><div><p className="text-xs text-gray-500 dark:text-gray-400">Phê duyệt</p><p className="font-medium text-gray-800 dark:text-gray-200">{selectedDoc.nguoi_phe_duyet || '---'}</p></div></div>
                 </div>
              </div>
              <div className="pt-6 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-400 dark:text-gray-500"><div className="grid grid-cols-2 gap-2"><span>Tạo: {format(new Date(selectedDoc.ngay_tao), 'dd/MM/yyyy HH:mm')} bởi {selectedDoc.nguoi_tao}</span><span className="text-right">Sửa: {format(new Date(selectedDoc.ngay_cap_nhat_cuoi), 'dd/MM/yyyy HH:mm')}</span></div></div>
            </div>

             <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 sticky bottom-0 grid grid-cols-2 gap-3">
               {(selectedDoc.trang_thai === TrangThaiTaiLieu.SOAN_THAO) ? (
                   <>
                     <Button variant="secondary" onClick={() => setViewMode('form')}><Pencil size={16} className="mr-2" /> Sửa</Button>
                     <Button onClick={handleSendRequest} className="bg-blue-600 hover:bg-blue-700 text-white" isLoading={isLoading} leftIcon={<Send size={16} />}>Gửi duyệt</Button>
                   </>
               ) : (
                   <>
                     <Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm border border-transparent" onClick={handleVersionUpClick} leftIcon={<FileUp size={16} />}>Nâng phiên bản</Button>
                     <Button variant="secondary" onClick={() => setViewMode('form')}><Pencil size={16} className="mr-2" /> Sửa thông tin</Button>
                   </>
               )}
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={showVersionModal} onClose={() => setShowVersionModal(false)} title="Nâng phiên bản tài liệu" footer={<><Button variant="ghost" onClick={() => setShowVersionModal(false)}>Hủy bỏ</Button><Button onClick={confirmVersionUp} leftIcon={<FileUp size={16} />}>Xác nhận & Tạo bản thảo</Button></>}>
        <div className="space-y-6">
           {selectedDoc && (
             <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 p-5 rounded-xl flex items-center justify-between border border-blue-100 dark:border-slate-700 relative overflow-hidden">
               <div className="relative z-10">
                  <p className="text-[10px] text-blue-600 dark:text-blue-300 font-bold uppercase tracking-wider mb-1">Phiên bản hiện tại</p>
                  <p className="text-3xl font-mono font-bold text-blue-700 dark:text-blue-400">{selectedDoc.phien_ban}</p>
               </div>
               
               <div className="flex items-center text-blue-300 dark:text-slate-600">
                  <div className="w-8 h-0.5 bg-current"></div>
                  <ChevronRight size={24} className="-ml-2" />
               </div>

               <div className="relative z-10 text-right">
                  <p className="text-[10px] text-green-600 dark:text-green-300 font-bold uppercase tracking-wider mb-1">Phiên bản mới</p>
                  <p className="text-3xl font-mono font-bold text-green-700 dark:text-green-400">{getNextVersion(selectedDoc.phien_ban, versionType)}</p>
               </div>
               
               {/* Decorators */}
               <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full blur-2xl opacity-50"></div>
               <div className="absolute -left-6 -bottom-6 w-24 h-24 bg-blue-100 dark:bg-blue-900/20 rounded-full blur-2xl opacity-50"></div>
             </div>
           )}
           
           <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">Chọn loại nâng cấp</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                    onClick={() => setVersionType('minor')} 
                    className={`relative p-4 rounded-xl border text-left transition-all duration-200 group hover:shadow-md ${versionType === 'minor' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-900/20 dark:border-blue-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700'}`}
                 >
                    <div className="flex justify-between items-start mb-2">
                       <div className={`p-2 rounded-lg ${versionType === 'minor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                          <Zap size={20} />
                       </div>
                       {versionType === 'minor' && <Check size={18} className="text-blue-600 dark:text-blue-400" />}
                    </div>
                    <span className={`block font-bold text-sm mb-1 ${versionType === 'minor' ? 'text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-200'}`}>Nâng cấp nhỏ (Minor)</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Sửa lỗi chính tả, format, thay đổi nhỏ không ảnh hưởng quy trình.</p>
                 </button>

                 <button 
                    onClick={() => setVersionType('major')} 
                    className={`relative p-4 rounded-xl border text-left transition-all duration-200 group hover:shadow-md ${versionType === 'major' ? 'bg-purple-50 border-purple-500 ring-1 ring-purple-500 dark:bg-purple-900/20 dark:border-purple-400' : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700'}`}
                 >
                    <div className="flex justify-between items-start mb-2">
                       <div className={`p-2 rounded-lg ${versionType === 'major' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-gray-400 group-hover:bg-purple-50 group-hover:text-purple-600'}`}>
                          <GitMerge size={20} />
                       </div>
                       {versionType === 'major' && <Check size={18} className="text-purple-600 dark:text-purple-400" />}
                    </div>
                    <span className={`block font-bold text-sm mb-1 ${versionType === 'major' ? 'text-purple-900 dark:text-purple-100' : 'text-gray-700 dark:text-gray-200'}`}>Nâng cấp lớn (Major)</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">Thay đổi nội dung, lưu đồ, biểu mẫu hoặc quy trình vận hành.</p>
                 </button>
              </div>
           </div>

           <div>
              <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Nội dung cập nhật / Lý do <span className="text-red-500">*</span></label>
              <textarea 
                 className="w-full p-4 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 ring-primary/20 focus:border-primary outline-none text-sm min-h-[120px] transition-shadow placeholder:text-gray-400" 
                 placeholder="Mô tả chi tiết các thay đổi so với phiên bản trước để lưu vào lịch sử..." 
                 value={versionReason} 
                 onChange={(e) => setVersionReason(e.target.value)}
              />
           </div>

           <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-xl flex gap-3 items-start border border-amber-100 dark:border-amber-800/30">
              <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
              <div>
                 <p className="text-xs font-bold text-amber-800 dark:text-amber-400 mb-1">Lưu ý quan trọng</p>
                 <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">Sau khi xác nhận, tài liệu phiên bản cũ ({selectedDoc?.phien_ban}) sẽ chuyển sang trạng thái "Hết hiệu lực". Một bản thảo mới sẽ được tạo ra để bạn bắt đầu chỉnh sửa.</p>
              </div>
           </div>
        </div>
      </Modal>
    </div>
  );
}
