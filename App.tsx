import React, { useState, useCallback, useEffect } from 'react';
import { useWorkoutStorage } from './hooks/useWorkoutStorage';
import { ImportScreen } from './components/ImportScreen';
import { Dashboard } from './components/Dashboard';
import { Activity } from 'lucide-react';
import { WorkoutRaw, ImportMode } from './types';
import { NotificationTimer } from './utils/notification';

const App: React.FC = () => {
  useEffect(() => {
    NotificationTimer.requestPermissions().catch(e => console.error('Notification permission error:', e));
  }, []);

  const [isReImport, setIsReImport] = useState(false);

  const {
    workouts,
    progress,
    annotations,
    rpeValues,
    loadValues,
    loadUnits,
    completionOrder,
    selection,
    isLoaded,
    toggleSet,
    updateAnnotation,
    updateRpeValue,
    updateLoadValue,
    updateLoadUnit,
    saveSelection,
    importWorkouts,
    exportWorkouts,
    clearData
  } = useWorkoutStorage();

  const handleReset = useCallback(() => {
    setIsReImport(true);
    clearData();
  }, [clearData]);

  const handleImport = useCallback((data: WorkoutRaw[], mode: ImportMode) => {
    importWorkouts(data, mode);
    setIsReImport(false);
  }, [importWorkouts]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gym-900 flex items-center justify-center">
        <Activity className="animate-spin text-gym-accent" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gym-900 text-slate-100">
      {workouts.length === 0 ? (
        <ImportScreen onImport={handleImport} hasExistingWorkouts={isReImport} />
      ) : (
        <Dashboard
          workouts={workouts}
          progress={progress}
          annotations={annotations}
          rpeValues={rpeValues}
          loadValues={loadValues}
          loadUnits={loadUnits}
          completionOrder={completionOrder}
          onToggleSet={toggleSet}
          onUpdateAnnotation={updateAnnotation}
          onUpdateRpeValue={updateRpeValue}
          onUpdateLoadValue={updateLoadValue}
          onUpdateLoadUnit={updateLoadUnit}
          onReset={handleReset}
          onExport={exportWorkouts}
          initialSelection={selection}
          onSaveSelection={saveSelection}
        />
      )}
    </div>
  );
};

export default App;
