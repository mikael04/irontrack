import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WorkoutRaw, WorkoutProgress, WorkoutAnnotations } from '../types';
import { ExerciseCard } from './ExerciseCard';
import { Settings, Trophy, CheckCircle, Download, Upload, X } from 'lucide-react';

interface DashboardProps {
  workouts: WorkoutRaw[];
  progress: WorkoutProgress;
  annotations: WorkoutAnnotations;
  completionOrder: string[];
  onToggleSet: (workoutId: string, setIndex: number, totalSets: number) => void;
  onUpdateAnnotation: (workoutId: string, annotation: string) => void;
  onReset: () => void;
  onExport: () => Promise<string>;
  initialSelection: { week: number | null; day: string | null };
  onSaveSelection: (week: number, day: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  workouts,
  progress,
  annotations,
  completionOrder,
  onToggleSet,
  onUpdateAnnotation,
  onReset,
  onExport,
  initialSelection,
  onSaveSelection
}) => {

  const [activeTimerWorkoutId, setActiveTimerWorkoutId] = useState<string | null>(null);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const weeks = useMemo(() => {
    const w = Array.from(new Set(workouts.map(w => w.week))).sort((a: number, b: number) => a - b);
    return w;
  }, [workouts]);

  const firstWeek = weeks[0] || 1;
  const firstDays = useMemo(() => {
    return Array.from(new Set(
      workouts
        .filter(w => w.week === firstWeek)
        .map(w => w.day)
    )).sort();
  }, [workouts, firstWeek]);
  const firstDay = firstDays[0] || 'A';

  const [selectedWeek, setSelectedWeek] = useState<number>(
    initialSelection.week && weeks.includes(initialSelection.week) ? initialSelection.week : firstWeek
  );
  const [selectedDay, setSelectedDay] = useState<string>(initialSelection.day || firstDay);

  const isInitializing = useRef(true);
  const lastSavedSelection = useRef<{ week: number; day: string } | null>(null);

  const days = useMemo(() => {
    return Array.from(new Set(
      workouts
        .filter(w => w.week === selectedWeek)
        .map(w => w.day)
    )).sort();
  }, [workouts, selectedWeek]);

  useEffect(() => {
    if (isInitializing.current) {
      if (initialSelection.week && initialSelection.day) {
        const validWeek = weeks.includes(initialSelection.week) ? initialSelection.week : firstWeek;
        const daysInWeek = Array.from(new Set(
          workouts
            .filter(w => w.week === validWeek)
            .map(w => w.day)
        )).sort();
        const validDay = daysInWeek.includes(initialSelection.day) ? initialSelection.day : daysInWeek[0];

        setSelectedWeek(validWeek);
        setSelectedDay(validDay || 'A');
        lastSavedSelection.current = { week: validWeek, day: validDay || 'A' };
      } else {
        lastSavedSelection.current = { week: firstWeek, day: firstDay };
      }
      isInitializing.current = false;
    }
  }, [initialSelection, weeks, firstWeek, workouts, firstDay]);

  useEffect(() => {
    if (!isInitializing.current && lastSavedSelection.current) {
      if (selectedWeek !== lastSavedSelection.current.week || selectedDay !== lastSavedSelection.current.day) {
        onSaveSelection(selectedWeek, selectedDay);
        lastSavedSelection.current = { week: selectedWeek, day: selectedDay };
      }
    }
  }, [selectedWeek, selectedDay, onSaveSelection]);

  useEffect(() => {
    if (!isInitializing.current) {
      const daysInWeek = Array.from(new Set(
        workouts
          .filter(w => w.week === selectedWeek)
          .map(w => w.day)
      )).sort();

      if (!daysInWeek.includes(selectedDay) && daysInWeek.length > 0) {
        setSelectedDay(daysInWeek[0]);
      }
    }
  }, [selectedWeek, workouts, selectedDay]);

  const currentDayWorkouts = useMemo(() => {
    return workouts.filter(w => w.week === selectedWeek && w.day === selectedDay);
  }, [workouts, selectedWeek, selectedDay]);

  const { activeWorkouts, finishedWorkouts } = useMemo(() => {
    const active: WorkoutRaw[] = [];
    const finished: WorkoutRaw[] = [];

    const orderMap = new Map<string, number>();
    completionOrder.forEach((id, index) => orderMap.set(id, index));

    currentDayWorkouts.forEach(w => {
      const p = progress[w.id] || [];
      const isDone = p.length >= w.total_sets && p.every(Boolean);

      if (isDone) {
        finished.push(w);
      } else {
        active.push(w);
      }
    });

    finished.sort((a, b) => {
      const orderA = orderMap.has(a.id) ? orderMap.get(a.id)! : -1;
      const orderB = orderMap.has(b.id) ? orderMap.get(b.id)! : -1;
      return orderB - orderA;
    });

    return { activeWorkouts: active, finishedWorkouts: finished };
  }, [currentDayWorkouts, progress, completionOrder]);

  const handleSetToggle = (workoutId: string, setIndex: number, totalSets: number) => {
    onToggleSet(workoutId, setIndex, totalSets);
    setTimerStartTime(Date.now());
    setActiveTimerWorkoutId(workoutId);
  };

  const progressStats = useMemo(() => {
    let totalSets = 0;
    let completedSets = 0;

    currentDayWorkouts.forEach(w => {
      totalSets += w.total_sets;
      const p = progress[w.id] || [];
      completedSets += p.filter(Boolean).length;
    });

    return { total: totalSets, completed: completedSets };
  }, [currentDayWorkouts, progress]);

  const progressPercentage = progressStats.total === 0 ? 0 : Math.round((progressStats.completed / progressStats.total) * 100);

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-30 bg-gym-900/95 backdrop-blur-md border-b border-gym-800 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 py-3">

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <div className="bg-gym-accent p-1.5 rounded-lg">
                <Trophy size={18} className="text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">IronTrack</h1>
            </div>
            <button
              onClick={() => setShowSettingsMenu(true)}
              className="text-xs text-gym-500 hover:text-white flex items-center space-x-1"
            >
              <Settings size={14} />
              <span>Settings</span>
            </button>
          </div>

          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
              {weeks.map(week => (
                <button
                  key={week}
                  onClick={() => setSelectedWeek(week)}
                  className={`
                            whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all
                            ${selectedWeek === week
                      ? 'bg-white text-gym-900 shadow-md'
                      : 'bg-gym-800 text-gym-400 hover:bg-gym-700'
                    }
                        `}
                >
                  Week {week}
                </button>
              ))}
            </div>

            <div className="flex border-b border-gym-700">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`
                            px-6 py-2 text-sm font-semibold border-b-2 transition-colors
                            ${selectedDay === day
                      ? 'border-gym-accent text-gym-accent'
                      : 'border-transparent text-gym-500 hover:text-gym-300'
                    }
                        `}
                >
                  Day {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-1 w-full bg-gym-800">
          <div
            className="h-full bg-gym-accent transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">

        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Day {selectedDay}
            </h2>
            <p className="text-gym-400 text-sm">
              {currentDayWorkouts.length > 0 ? currentDayWorkouts[0].focus : 'Rest Day'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl font-black text-white">{progressPercentage}%</span>
            <p className="text-xs text-gym-500 uppercase tracking-wide">Daily Goal</p>
          </div>
        </div>

        <div className="space-y-4">
          {activeWorkouts.length === 0 && finishedWorkouts.length === 0 && (
            <div className="text-center py-20 bg-gym-800/50 rounded-xl border border-dashed border-gym-700">
              <p className="text-gym-500">No exercises found for this day.</p>
            </div>
          )}

          {activeWorkouts.map(workout => (
            <ExerciseCard
              key={workout.id}
              workout={workout}
              completedSets={progress[workout.id] || []}
              onToggleSet={(setIndex) => handleSetToggle(workout.id, setIndex, workout.total_sets)}
              showTimer={activeTimerWorkoutId === workout.id}
              timerStartTime={timerStartTime}
              isFinished={false}
              annotation={annotations[workout.id] || ''}
              onAnnotationChange={(annotation) => onUpdateAnnotation(workout.id, annotation)}
            />
          ))}

          {finishedWorkouts.length > 0 && (
            <div className="pt-8 pb-4">
              <div className="flex items-center space-x-3 text-gym-500 mb-4">
                <CheckCircle size={20} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Completed Exercises</h3>
                <div className="h-px bg-gym-800 flex-grow"></div>
              </div>

              <div className="space-y-4">
                {finishedWorkouts.map(workout => (
                  <ExerciseCard
                    key={workout.id}
                    workout={workout}
                    completedSets={progress[workout.id] || []}
                    onToggleSet={(setIndex) => handleSetToggle(workout.id, setIndex, workout.total_sets)}
                    showTimer={activeTimerWorkoutId === workout.id}
                    timerStartTime={timerStartTime}
                    isFinished={true}
                    annotation={annotations[workout.id] || ''}
                    onAnnotationChange={(annotation) => onUpdateAnnotation(workout.id, annotation)}
                  />
                ))}
              </div>
            </div>
           )}
         </div>
       </main>

       {/* Settings Menu Modal */}
       {showSettingsMenu && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
         <div className="bg-gym-900 border border-gym-700 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
         <div className="p-4 border-b border-gym-800 flex justify-between items-center">
         <h3 className="font-bold text-white">Settings</h3>
         <button
           onClick={() => setShowSettingsMenu(false)}
           className="text-gym-500 hover:text-white"
         >
           <X size={20} />
         </button>
         </div>
         <div className="p-4 space-y-3">
         <button
           onClick={async () => {
             setShowSettingsMenu(false);
             try {
               const filePath = await onExport();
               alert(`Training exported successfully!\n\nFile saved to:\n${filePath}\n\nYou can find it in your file manager app.`);
             } catch (error: any) {
               console.error('Export error:', error);
               alert(`Failed to export training.\n\nError: ${error?.message || 'Unknown error'}\n\nPlease check app permissions and try again.`);
             }
           }}
           className="w-full p-4 rounded-xl border border-gym-700 hover:border-gym-accent hover:bg-gym-accent/5 transition-all text-left group"
         >
           <div className="flex items-start gap-3">
           <div className="bg-gym-800 p-2 rounded-lg group-hover:bg-gym-accent/20 transition-colors">
           <Download size={18} className="text-gym-400 group-hover:text-gym-accent" />
           </div>
           <div>
           <div className="font-semibold text-white mb-1">Export Training</div>
           <div className="text-xs text-gym-500">
           Save your training plan with progress and annotations to a CSV file
           </div>
           </div>
           </div>
         </button>

         <button
           onClick={() => {
             setShowSettingsMenu(false);
             if (confirm('Are you sure you want to clear all data and import a new file?')) {
               onReset();
             }
           }}
           className="w-full p-4 rounded-xl border border-gym-700 hover:border-gym-accent hover:bg-gym-accent/5 transition-all text-left group"
         >
           <div className="flex items-start gap-3">
           <div className="bg-gym-800 p-2 rounded-lg group-hover:bg-gym-accent/20 transition-colors">
           <Upload size={18} className="text-gym-400 group-hover:text-gym-accent" />
           </div>
           <div>
           <div className="font-semibold text-white mb-1">Import New Training</div>
           <div className="text-xs text-gym-500">
           Load a new training plan from a CSV file (clears existing data)
           </div>
           </div>
           </div>
         </button>
         </div>
         </div>
         </div>
       )}
     </div>
   );
};
