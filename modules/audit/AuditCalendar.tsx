
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { endOfMonth, endOfWeek, eachDayOfInterval, format, isSameDay, isSameMonth, addMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon, Clock, Layers } from 'lucide-react';
import { KeHoachDanhGia, PhienDanhGia } from '../../types';
// @ts-ignore
import { Solar } from 'lunar-javascript';

interface AuditCalendarProps {
  auditPlans: KeHoachDanhGia[];
  onEventClick?: (plan: KeHoachDanhGia, session: PhienDanhGia | null) => void;
}

// --- Local Date Helpers ---
const startOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const subMonths = (date: Date, amount: number) => {
  return addMonths(date, -amount);
};

const startOfWeek = (date: Date, options?: { weekStartsOn: number }) => {
  const weekStartsOn = options?.weekStartsOn || 0;
  const newDate = new Date(date);
  const day = newDate.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  newDate.setDate(newDate.getDate() - diff);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

// --- Logic xử lý sự kiện ---
const getCalendarEvents = (plans: KeHoachDanhGia[]) => {
  const events: Array<{ date: Date; session: PhienDanhGia | null; plan: KeHoachDanhGia; isPlanStart?: boolean }> = [];
  
  plans.forEach(plan => {
    let hasSessions = false;

    // 1. Check & Add Sessions
    if (plan.danh_sach_phien && plan.danh_sach_phien.length > 0) {
      plan.danh_sach_phien.forEach(session => {
        if (session.thoi_gian_bat_dau) {
          hasSessions = true;
          events.push({
            date: new Date(session.thoi_gian_bat_dau),
            session: session,
            plan: plan
          });
        }
      });
    }

    // 2. Fallback: Nếu không có session nào, hiển thị ngày bắt đầu kế hoạch
    if (!hasSessions && plan.thoi_gian_du_kien_start) {
      events.push({
        date: new Date(plan.thoi_gian_du_kien_start),
        session: null, // Null session indicates it's the plan itself
        plan: plan,
        isPlanStart: true
      });
    }
  });
  return events;
};

// Helper: Convert Solar Date to Lunar Date String
const getLunarDateInfo = (date: Date) => {
  try {
    const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const lunar = solar.getLunar();
    const day = lunar.getDay();
    const month = lunar.getMonth();
    return {
      day: day,
      month: month,
      dayString: day === 1 ? `${day}/${month}` : `${day}`,
      isMajor: day === 1 || day === 15 // Mùng 1 hoặc Rằm
    };
  } catch (e) {
    return { day: 0, month: 0, dayString: '', isMajor: false };
  }
};

export const AuditCalendar: React.FC<AuditCalendarProps> = ({ auditPlans, onEventClick }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  const events = useMemo(() => getCalendarEvents(auditPlans), [auditPlans]);

  // Click outside to close picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const onNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const onPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const onToday = () => setCurrentMonth(new Date());

  // Picker Handlers
  const handleYearChange = (offset: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear() + offset, prev.getMonth(), 1));
  };

  const handleMonthSelect = (monthIndex: number) => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), monthIndex, 1));
    setShowDatePicker(false);
  };

  // Generate calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday (VN standard)
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 
    'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 
    'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-lg shadow border border-gray-200 dark:border-slate-800 overflow-hidden relative">
      
      {/* Calendar Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 shrink-0 z-20">
        <div className="flex items-center gap-4">
           {/* Custom Month/Year Picker */}
           <div className="relative" ref={datePickerRef}>
              <button 
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`
                  flex items-center gap-2 py-1.5 px-3 rounded-lg border transition-all
                  ${showDatePicker 
                    ? 'bg-white dark:bg-slate-800 border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                    : 'bg-transparent border-transparent hover:bg-white/50 dark:hover:bg-slate-700/50 hover:border-gray-200 dark:hover:border-slate-600'}
                `}
              >
                  <CalendarIcon size={18} className="text-gray-500 dark:text-gray-400" />
                  <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 capitalize">
                    Tháng {format(currentMonth, 'MM / yyyy')}
                  </h2>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showDatePicker ? 'rotate-180' : ''}`} />
              </button>

              {/* Picker Popover */}
              {showDatePicker && (
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-2xl p-4 w-72 z-50 animate-in fade-in zoom-in-95 duration-100">
                   {/* Year Control */}
                   <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-slate-700">
                      <button onClick={() => handleYearChange(-1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300">
                        <ChevronLeft size={20} />
                      </button>
                      <span className="text-xl font-bold text-gray-800 dark:text-gray-100">{currentMonth.getFullYear()}</span>
                      <button onClick={() => handleYearChange(1)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg text-gray-600 dark:text-gray-300">
                        <ChevronRight size={20} />
                      </button>
                   </div>
                   
                   {/* Months Grid */}
                   <div className="grid grid-cols-3 gap-2">
                      {monthNames.map((name, index) => {
                        const isSelected = currentMonth.getMonth() === index;
                        const isCurrentMonth = new Date().getMonth() === index && new Date().getFullYear() === currentMonth.getFullYear();
                        
                        return (
                          <button
                            key={index}
                            onClick={() => handleMonthSelect(index)}
                            className={`
                              py-2 rounded-lg text-sm font-medium transition-all
                              ${isSelected 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                              }
                              ${isCurrentMonth && !isSelected ? 'border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400' : ''}
                            `}
                          >
                            {name}
                          </button>
                        );
                      })}
                   </div>
                </div>
              )}
           </div>

           <div className="flex bg-white dark:bg-slate-700 rounded border border-gray-300 dark:border-slate-600">
              <button onClick={onPrevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-l border-r border-gray-300 dark:border-slate-600 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={onToday} className="px-3 text-sm font-medium hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors border-r border-gray-300 dark:border-slate-600">
                Hôm nay
              </button>
              <button onClick={onNextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-600 rounded-r transition-colors">
                <ChevronRight size={18} />
              </button>
           </div>
        </div>
        
        {/* Legend */}
        <div className="hidden md:flex items-center gap-4 text-xs font-medium text-gray-600 dark:text-gray-400">
           <div className="flex items-center gap-2">
              <div className="w-2 h-4 rounded bg-purple-500"></div>
              <span>Kế hoạch tổng</span>
           </div>
           <div className="flex items-center gap-2">
              <div className="w-2 h-4 rounded bg-sky-500"></div>
              <span>Phiên đánh giá</span>
           </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] overflow-hidden border-b border-gray-200 dark:border-slate-800">
        {/* Weekday Headers */}
        {weekDays.map(day => (
          <div key={day} className="py-2 text-center text-xs font-bold text-gray-500 uppercase border-b border-r border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 last:border-r-0">
            {day}
          </div>
        ))}

        {/* Days Grid: Dùng gap-px + bg-gray-200 để tạo border tự nhiên, tránh bị lệch */}
        <div className="col-span-7 grid grid-cols-7 auto-rows-fr overflow-y-auto bg-gray-200 dark:bg-slate-800 gap-px">
           {calendarDays.map((day) => {
             const isCurrentMonth = isSameMonth(day, currentMonth);
             const isTodayDate = isToday(day);
             const lunarInfo = getLunarDateInfo(day);
             
             // Get events for this day
             const dayEvents = events.filter(e => isSameDay(e.date, day));

             // Determine Solar Date Class (Logic tách biệt hoàn toàn để tránh xung đột màu)
             let solarDateClass = "";
             if (isTodayDate) {
                 solarDateClass = "text-blue-700 dark:text-blue-400 font-extrabold scale-125 bg-blue-100 dark:bg-blue-900/30 w-7 h-7 flex items-center justify-center rounded-full shadow-sm"; 
             } else if (isCurrentMonth) {
                 solarDateClass = "text-gray-700 dark:text-gray-200 font-bold"; 
             } else {
                 solarDateClass = "text-gray-400 dark:text-slate-600 font-bold"; 
             }

             return (
               <div 
                 key={day.toString()} 
                 className={`
                   min-h-[120px] flex flex-col p-1 relative transition-colors group
                   ${isCurrentMonth ? 'bg-white dark:bg-slate-900' : 'bg-gray-50 dark:bg-slate-950/50'}
                   ${isTodayDate ? 'z-10' : ''} 
                 `}
               >
                 {/* --- Date Header (Updated Layout) --- */}
                 <div className="flex items-start justify-between px-1 mt-1">
                    {/* Solar Date */}
                    <span className={`text-sm leading-none transition-all ${solarDateClass}`}>
                      {format(day, 'd')}
                    </span>
                    
                    {/* Lunar Date (Small, Top Right) */}
                    <span className={`
                      text-[10px] 
                      ${lunarInfo.isMajor ? 'text-yellow-600 dark:text-yellow-500 font-bold bg-yellow-50 dark:bg-yellow-900/30 px-1 rounded' : 'text-gray-400 dark:text-slate-600 italic'}
                    `}>
                      {lunarInfo.dayString}
                    </span>
                 </div>

                 {/* Events List - Improved with distinct styles and scrolling */}
                 <div className="flex-1 w-full space-y-1.5 overflow-y-auto custom-scrollbar relative z-10 px-1 mt-2">
                    {dayEvents.map((evt, idx) => {
                      const isPlan = evt.isPlanStart;
                      return (
                        <div 
                          key={idx}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEventClick && onEventClick(evt.plan, evt.session);
                          }}
                          className={`
                            w-full p-1.5 rounded-r-md text-[10px] cursor-pointer transition-all border-l-[3px] shadow-sm hover:shadow-md hover:brightness-95
                            flex flex-col gap-0.5
                            ${isPlan 
                               ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-500 text-purple-900 dark:text-purple-100' 
                               : 'bg-sky-50 dark:bg-sky-900/20 border-sky-500 text-sky-900 dark:text-sky-100'
                             }
                          `}
                        >
                           <div className="flex items-center gap-1.5">
                              {isPlan ? <Layers size={10} className="shrink-0 opacity-70"/> : <Clock size={10} className="shrink-0 opacity-70"/>}
                              <span className={`font-bold ${isPlan ? 'text-purple-700 dark:text-purple-300' : 'text-sky-700 dark:text-sky-300'}`}>
                                {isPlan ? 'KẾ HOẠCH' : format(new Date(evt.session!.thoi_gian_bat_dau), 'HH:mm')}
                              </span>
                           </div>
                           <p className="font-medium leading-tight line-clamp-2 opacity-90 pl-4">
                             {isPlan ? evt.plan.ten_ke_hoach : evt.session!.tieu_de}
                           </p>
                        </div>
                      );
                    })}
                 </div>
                 
                 {/* Highlight Lunar Major Days Background (Rằm/Mùng 1) */}
                 {lunarInfo.isMajor && (
                    <div className="absolute inset-0 pointer-events-none bg-yellow-50/10 dark:bg-yellow-900/5 z-0" />
                 )}
               </div>
             );
           })}
        </div>
      </div>
    </div>
  );
};
