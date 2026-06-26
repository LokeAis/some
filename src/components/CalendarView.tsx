import React, { useState } from 'react';
import { MonthPlanItem } from '../types';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Calendar as CalendarIcon, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  plan: MonthPlanItem[];
  onUpdatePlan: (newPlan: MonthPlanItem[]) => void;
  onSelectPost: (item: MonthPlanItem) => void;
}

const CHANNELS = ['Facebook', 'Instagram', 'LinkedIn', 'TikTok', 'X/Twitter'];

const getChannelColor = (channel: string) => {
  switch (channel) {
    case 'Facebook': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Instagram': return 'bg-pink-100 text-pink-700 border-pink-200';
    case 'LinkedIn': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'TikTok': return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    case 'X/Twitter': return 'bg-slate-100 text-slate-700 border-slate-200';
    default: return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
};

function DraggablePost({ item, onSelect }: { item: MonthPlanItem, onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${item.day}-${item.channel}-${item.theme}`,
    data: item,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 mb-2 rounded-md border text-xs cursor-grab active:cursor-grabbing shadow-sm bg-white hover:shadow-md transition-shadow ${getChannelColor(item.channel)}`}
      onClick={(e) => {
        // Prevent drag from triggering click if we just dragged
        if (!isDragging) {
          e.stopPropagation();
          onSelect();
        }
      }}
    >
      <div className="font-semibold truncate">{item.theme}</div>
      <div className="text-[10px] opacity-80 truncate">{item.format}</div>
    </div>
  );
}

function DroppableCell({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });
  
  return (
    <div
      ref={setNodeRef}
      className={`${className} transition-colors ${isOver ? 'bg-indigo-50 border-indigo-200' : ''}`}
    >
      {children}
    </div>
  );
}

export function CalendarView({ plan, onUpdatePlan, onSelectPost }: Props) {
  const [view, setView] = useState<'month' | 'week'>('month');
  const [currentWeek, setCurrentWeek] = useState(0); // 0 to 4
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<MonthPlanItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setActiveItem(event.active.data.current as MonthPlanItem);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setActiveItem(null);
    const { active, over } = event;

    if (!over) return;

    const activeItem = active.data.current as MonthPlanItem;
    const overId = String(over.id);

    let newDay = activeItem.day;
    let newChannel = activeItem.channel;

    if (view === 'month') {
      // overId is just the day number
      newDay = parseInt(overId, 10);
    } else {
      // overId is `${day}-${channel}`
      const [dayStr, channel] = overId.split('-');
      newDay = parseInt(dayStr, 10);
      newChannel = channel;
    }

    if (newDay !== activeItem.day || newChannel !== activeItem.channel) {
      const newPlan = plan.map(p => {
        if (p.day === activeItem.day && p.channel === activeItem.channel && p.theme === activeItem.theme) {
          return { ...p, day: newDay, channel: newChannel };
        }
        return p;
      });
      onUpdatePlan(newPlan);
    }
  };

  const renderMonthView = () => {
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
        {days.map(day => {
          const dayPosts = plan.filter(p => p.day === day);
          return (
            <DroppableCell
              key={day}
              id={String(day)}
              className="min-h-[120px] bg-white border border-neutral-200 rounded-xl p-2 flex flex-col"
            >
              <div className="text-xs font-semibold text-neutral-500 mb-2 border-b pb-1">Dag {day}</div>
              <div className="flex-1">
                {dayPosts.map((post, i) => (
                  <DraggablePost key={`${post.day}-${post.channel}-${post.theme}-${i}`} item={post} onSelect={() => onSelectPost(post)} />
                ))}
              </div>
            </DroppableCell>
          );
        })}
      </div>
    );
  };

  const renderWeekView = () => {
    const startDay = currentWeek * 7 + 1;
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = startDay + i;
      return d <= 30 ? d : null;
    }).filter(Boolean) as number[];

    const activeChannels = Array.from(new Set(plan.map(p => p.channel)));
    // Always show all default channels plus any custom channels in the plan
    const channelsToShow = Array.from(new Set([...CHANNELS, ...activeChannels]));

    return (
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="col-span-1"></div>
            {days.map(day => (
              <div key={`header-${day}`} className="col-span-1 text-center font-semibold text-sm text-neutral-600 bg-neutral-50 py-2 rounded-lg border border-neutral-200">
                Dag {day}
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            {channelsToShow.map(channel => (
              <div key={channel} className="grid grid-cols-8 gap-2">
                <div className="col-span-1 flex items-center justify-end pr-4 text-sm font-medium text-neutral-700">
                  {channel}
                </div>
                {days.map(day => {
                  const cellId = `${day}-${channel}`;
                  const cellPosts = plan.filter(p => p.day === day && p.channel === channel);
                  
                  return (
                    <DroppableCell
                      key={cellId}
                      id={cellId}
                      className="col-span-1 min-h-[100px] bg-white border border-neutral-200 rounded-xl p-2"
                    >
                      {cellPosts.map((post, i) => (
                        <DraggablePost key={`${post.day}-${post.channel}-${post.theme}-${i}`} item={post} onSelect={() => onSelectPost(post)} />
                      ))}
                    </DroppableCell>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex bg-neutral-100 p-1 rounded-lg">
          <button
            onClick={() => setView('month')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Månad</span>
          </button>
          <button
            onClick={() => setView('week')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === 'week' ? 'bg-white text-indigo-600 shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Veke (Kanal)</span>
          </button>
        </div>

        {view === 'week' && (
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setCurrentWeek(Math.max(0, currentWeek - 1))}
              disabled={currentWeek === 0}
              className="p-1.5 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-neutral-700 min-w-[60px] text-center">
              Veke {currentWeek + 1}
            </span>
            <button
              onClick={() => setCurrentWeek(Math.min(4, currentWeek + 1))}
              disabled={currentWeek === 4}
              className="p-1.5 rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {view === 'month' ? renderMonthView() : renderWeekView()}
        
        <DragOverlay>
          {activeItem ? (
            <div className={`p-2 rounded-md border text-xs shadow-lg bg-white opacity-90 ${getChannelColor(activeItem.channel)}`}>
              <div className="font-semibold truncate">{activeItem.theme}</div>
              <div className="text-[10px] opacity-80 truncate">{activeItem.format}</div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
