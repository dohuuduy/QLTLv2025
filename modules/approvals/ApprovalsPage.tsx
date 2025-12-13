
import React, { useState, useMemo } from 'react';
import { DataTable } from '../../components/DataTable';
import { TaiLieu, ColumnDefinition, TrangThaiTaiLieu, NhanSu, LichSuHoatDong } from '../../types';
import { format } from 'date-fns';
import { FileCheck, Clock, CheckCircle, XCircle, ShieldCheck, Eye, FileText, AlertOctagon, PenTool } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { upsertDocument } from '../../services/supabaseService';
import { useDialog } from '../../contexts/DialogContext';

interface ApprovalsPageProps {
  currentUser: NhanSu;
  documents: TaiLieu[];
  onUpdate: (docs: TaiLieu[]) => void;
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({ currentUser, documents, onUpdate }) => {
  const pendingDocs = useMemo(() => {
    return documents.filter(doc => {
        if (doc.trang_thai !== TrangThaiTaiLieu.CHO_DUYET) return false;
        if (currentUser.roles.includes('QUAN_TRI')) return true;
        return doc.nguoi_xem_xet === currentUser.ho_ten || doc.nguoi_phe_duyet === currentUser.ho_ten;
     });
  }, [documents, currentUser]);

  const [selectedDoc, setSelectedDoc] = useState<TaiLieu | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dialog = useDialog();

  const openActionModal = (doc: TaiLieu, reject: boolean) => {
    setSelectedDoc(doc);
    setIsRejecting(reject);
    setComment('');
    setShowSignModal(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedDoc) return;
    
    if (isRejecting && !comment.trim()) {
        dialog.alert("Vui lòng nhập lý do từ chối!", { type: 'warning' });
        return;
    }
    setIsLoading(true);

    const now = new Date().toISOString();
    const actionName = isRejecting ? "Đã TỪ CHỐI" : "Đã PHÊ DUYỆT";
    
    const newLog: LichSuHoatDong = {
        id: `H${Date.now()}`,
        nguoi_thuc_hien: currentUser.ho_ten,
        hanh_dong: isRejecting ? 'TU_CHOI' : 'PHE_DUYET',
        thoi_gian: now,
        ghi_chu: comment || (isRejecting ? 'Trả về yêu cầu chỉnh sửa' : 'Đồng ý thông qua'),
        trang_thai_cu: selectedDoc.trang_thai,
        trang_thai_moi: isRejecting ? TrangThaiTaiLieu.SOAN_THAO : TrangThaiTaiLieu.DA_BAN_HANH
    };

    const updatedDoc: TaiLieu = {
        ...selectedDoc,
        trang_thai: isRejecting ? TrangThaiTaiLieu.SOAN_THAO : TrangThaiTaiLieu.DA_BAN_HANH,
        ngay_cap_nhat_cuoi: now,
        nguoi_cap_nhat_cuoi: currentUser.ho_ten,
        ...( !isRejecting ? { ngay_ban_hanh: format(new Date(), 'yyyy-MM-dd') } : {}),
        lich_su: [...(selectedDoc.lich_su || []), newLog]
    };

    try {
        await upsertDocument(updatedDoc);
        
        const updatedDocs = documents.map(doc => doc.id === selectedDoc.id ? updatedDoc : doc);
        onUpdate(updatedDocs);
        console.log(`[ISO LOG] ${actionName} | Doc: ${selectedDoc.ma_tai_lieu}`);
        setShowSignModal(false);
        dialog.alert(isRejecting ? 'Đã trả về tài liệu thành công!' : 'Đã phê duyệt tài liệu thành công!', { type: 'success' });
    } catch (error) {
        dialog.alert("Lỗi khi cập nhật trạng thái tài liệu!", { type: 'error' });
    } finally {
        setIsLoading(false);
    }
  };

  const columns: ColumnDefinition<TaiLieu>[] = [
    // FIX: Updated to text-blue-700 dark:text-blue-400
    { key: 'ma_tai_lieu', header: 'Mã số', visible: true, render: (val) => <span className="font-mono font-bold text-blue-700 dark:text-blue-400">{val}</span> },
    { key: 'ten_tai_lieu', header: 'Tên Tài Liệu', visible: true, render: (val, doc) => (<div><div className="font-medium text-gray-900 dark:text-gray-100">{val}</div><div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5"><span className="bg-gray-100 dark:bg-slate-800 px-1.5 rounded border border-gray-200 dark:border-slate-700 dark:text-gray-300">v{doc.phien_ban}</span><span>•</span><span className="dark:text-gray-400">{doc.loai_tai_lieu}</span></div></div>) },
    { key: 'nguoi_soan_thao', header: 'Người trình', visible: true, render: (val) => <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-bold">{String(val).charAt(0)}</div><span className="text-sm dark:text-gray-300">{val}</span></div> },
    { key: 'ngay_cap_nhat_cuoi', header: 'Ngày trình', visible: true, render: (val) => <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs"><Clock size={12}/>{format(new Date(val), 'dd/MM/yyyy')}</span> },
    { key: 'trang_thai', header: 'Vai trò', visible: true, render: (_, doc) => { const isApprover = doc.nguoi_phe_duyet === currentUser.ho_ten; if (currentUser.roles.includes('QUAN_TRI') && doc.nguoi_phe_duyet !== currentUser.ho_ten && doc.nguoi_xem_xet !== currentUser.ho_ten) { return <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-1 rounded-full dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400">Quản trị viên</span>; } return isApprover ? <span className="text-[10px] font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-full shadow-sm flex w-fit items-center gap-1 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300"><PenTool size={10}/> Phê duyệt</span> : <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-2 py-1 rounded-full shadow-sm flex w-fit items-center gap-1 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"><Eye size={10}/> Xem xét</span>; } },
    { key: 'id', header: 'Tác vụ', visible: true, render: (_, item) => (<div className="flex gap-2"><Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 px-3 shadow-sm" onClick={(e) => { e.stopPropagation(); openActionModal(item, false); }} title="Phê duyệt"><CheckCircle size={14} className="mr-1.5"/> Duyệt</Button><Button size="sm" className="bg-white text-red-600 border border-red-200 hover:bg-red-50 h-8 px-2 dark:bg-transparent dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20" onClick={(e) => { e.stopPropagation(); openActionModal(item, true); }} title="Từ chối / Trả về"><XCircle size={14} /></Button></div>) }
  ];

  const getRoleText = () => { if (!selectedDoc) return ''; return selectedDoc.nguoi_phe_duyet === currentUser.ho_ten ? 'PHÊ DUYỆT' : 'XEM XÉT'; }

  return (
    <div className="space-y-6 animate-fade-in h-full flex flex-col">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-800/50 shadow-sm">
          <div className="flex items-center gap-4"><div className="bg-white dark:bg-orange-900/40 p-3 rounded-xl shadow-sm text-orange-600 dark:text-orange-400"><FileCheck size={28} /></div><div><h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Cần xử lý: {pendingDocs.length} tài liệu</h2><p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Danh sách các tài liệu đang chờ bạn xem xét hoặc phê duyệt.</p></div></div>
       </div>
       <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900"><DataTable data={pendingDocs} columns={columns} onRowClick={() => {}} /></div>
       <Modal isOpen={showSignModal} onClose={() => setShowSignModal(false)} title={isRejecting ? 'Xác nhận Từ chối' : `Xác nhận ${getRoleText()}`} size="md" footer={<div className="flex justify-end gap-2 w-full"><Button variant="ghost" onClick={() => setShowSignModal(false)}>Hủy bỏ</Button><Button onClick={handleConfirmAction} isLoading={isLoading} className={isRejecting ? "bg-red-600 hover:bg-red-700 text-white shadow-red-200" : "bg-green-600 hover:bg-green-700 text-white shadow-green-200"} leftIcon={isRejecting ? <XCircle size={16}/> : <CheckCircle size={16}/>}>{isRejecting ? 'Xác nhận Từ chối' : 'Xác nhận Duyệt'}</Button></div>}>
          <div className="space-y-0 divide-y divide-gray-100 dark:divide-slate-800">
             <div className="p-5 bg-gray-50/50 dark:bg-slate-800/50">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2"><FileText size={14} /> Thông tin tài liệu</h4>
                {selectedDoc && (<div className="space-y-3"><div><label className="text-[10px] text-gray-400 block uppercase">Mã & Phiên bản</label><div className="font-mono font-bold text-blue-700 dark:text-blue-400 text-sm">{selectedDoc.ma_tai_lieu} <span className="text-gray-400 font-normal ml-1">v{selectedDoc.phien_ban}</span></div></div><div><label className="text-[10px] text-gray-400 block uppercase">Tên tài liệu</label><div className="font-bold text-gray-800 dark:text-gray-100 text-sm">{selectedDoc.ten_tai_lieu}</div></div><div className="text-xs text-gray-600 dark:text-gray-400 italic bg-white dark:bg-slate-900 p-2 rounded border border-gray-200 dark:border-slate-700">{selectedDoc.mo_ta_tom_tat || "Không có mô tả"}</div></div>)}
             </div>
             <div className="p-5 space-y-4">
                <div className={`flex items-start gap-3 p-3 rounded-lg text-sm border ${isRejecting ? 'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-900 dark:text-red-300' : 'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/20 dark:border-blue-900 dark:text-blue-300'}`}>{isRejecting ? <AlertOctagon size={18} className="shrink-0 mt-0.5" /> : <ShieldCheck size={18} className="shrink-0 mt-0.5" />}<div><p className="font-bold text-sm">{isRejecting ? 'Trả về / Từ chối' : 'Phê duyệt nhanh'}</p><p className="text-xs opacity-90 mt-1">{isRejecting ? "Tài liệu sẽ được chuyển lại trạng thái Soạn thảo." : "Xác nhận nội dung tài liệu này là chính xác và đồng ý ban hành/thông qua."}</p></div></div>
                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ý kiến / Ghi chú {isRejecting && <span className="text-red-500">*</span>}</label><textarea className={`w-full p-3 rounded-xl border bg-white dark:bg-slate-900 outline-none text-sm min-h-[80px] transition-all ${isRejecting ? 'border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:border-red-900 dark:placeholder-red-400/50' : 'border-gray-300 dark:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`} placeholder={isRejecting ? "Nhập lý do từ chối..." : "Nhập ghi chú (nếu có)..."} value={comment} onChange={(e) => setComment(e.target.value)} autoFocus/></div>
             </div>
          </div>
       </Modal>
    </div>
  );
};
