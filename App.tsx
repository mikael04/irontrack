import React from 'react';
import { useWorkoutStorage } from './hooks/useWorkoutStorage';
import { ImportScreen } from './components/ImportScreen';
import { Dashboard } from './components/Dashboard';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  const { 
    workouts, 
    progress,
    completionOrder,
    selection,
    isLoaded, 
    toggleSet, 
    saveSelection,
    importWorkouts, 
    clearData 
  } = useWorkoutStorage();

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
        <ImportScreen onImport={importWorkouts} />
      ) : (
        <Dashboard 
          workouts={workouts} 
          progress={progress}
          completionOrder={completionOrder}
          onToggleSet={toggleSet}
          onReset={clearData}
          initialSelection={selection}
          onSaveSelection={saveSelection}
        />
      )}
    </div>
  );
};

export default App;
