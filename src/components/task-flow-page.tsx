'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isPast } from 'date-fns';
import { TaskFlowLogo } from '@/components/task-flow-logo';
import { Button } from '@/components/ui/button';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { TaskList } from '@/components/task-list';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { TaskFilters, type StatusFilter } from '@/components/task-filters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/types';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const stableInitialValue = useMemo(() => initialValue, []);
  
  useEffect(() => {
    if (isMounted) {
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : stableInitialValue);
      } catch (error) {
        console.error(error);
        setStoredValue(stableInitialValue);
      }
    }
  }, [isMounted, key, stableInitialValue]);

  useEffect(() => {
    if (isMounted) {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    }
  }, [key, storedValue, isMounted]);


  return [storedValue, setStoredValue];
}


export function TaskFlowPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const { toast } = useToast();
  const importFileInput = useRef<HTMLInputElement>(null);

  const exportTasks = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(tasks, null, 2)
    )}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "task-progress.json";

    link.click();
    toast({
      title: "Success",
      description: "Your tasks have been exported.",
    });
  };

  const importTasks = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not read file.",
        });
        return;
      }
      try {
        const tasksToImport = JSON.parse(text);
        // Basic validation
        if (!Array.isArray(tasksToImport) || !tasksToImport.every(task => 'id' in task && 'title' in task)) {
          throw new Error("Invalid file format.");
        }
        setTasks(tasksToImport);
        toast({
          title: "Success",
          description: "Your tasks have been imported.",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not import tasks. Invalid JSON file.",
        });
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (importFileInput.current) {
      importFileInput.current.value = "";
    }
  };

  const addTask = (task: Omit<Task, 'id' | 'completed' | 'completedAt'>) => {
    const newTask: Task = {
      ...task,
      id: uuidv4(),
      completed: false,
    };
    setTasks((prevTasks) => [...prevTasks, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prevTasks) => {
      const newTasks = [...prevTasks];
      const taskIndex = newTasks.findIndex((task) => task.id === id);
      if (taskIndex === -1) return prevTasks;
  
      const originalTask = newTasks[taskIndex];
      const updatedTask = { ...originalTask, ...updates };
      newTasks[taskIndex] = updatedTask;
  
      if (
        updates.completed &&
        originalTask.isRecurring &&
        (originalTask.repetitions ?? 0) > 0
      ) {
        const newRepetitions = (originalTask.repetitions ?? 1) - 1;

        if (newRepetitions > 0) {
            const newTask: Task = {
                ...originalTask,
                id: uuidv4(),
                completed: false,
                completedAt: undefined,
                repetitions: newRepetitions,
                subtasks: originalTask.subtasks.map(sub => ({...sub, completed: false})),
            };
            newTasks.push(newTask);
        }
      }
  
      return newTasks;
    });
  };

  const deleteTask = (id: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (statusFilter === 'completed') return task.completed;
        if (statusFilter === 'active') return !task.completed;
        if (statusFilter === 'overdue') {
            return !task.completed && task.dueDate && isPast(new Date(task.dueDate));
        }
        return true; // for 'all'
      })
      .sort((a, b) => (a.completed ? 1 : -1) - (b.completed ? 1 : -1) || (new Date(b.dueDate || 0).getTime() - new Date(a.dueDate || 0).getTime()));
  }, [tasks, statusFilter]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <TaskFlowLogo className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold font-headline text-foreground">
              TaskFlow
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportTasks}>Export Progress</Button>
            <Button variant="outline" onClick={() => importFileInput.current?.click()}>Import Progress</Button>
            <AddTaskDialog addTask={addTask} />
            <input
              type="file"
              ref={importFileInput}
              className="hidden"
              accept=".json"
              onChange={importTasks}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4">
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard">
            <div className="flex justify-start mb-4">
              <TaskFilters
                currentFilter={statusFilter}
                onFilterChange={setStatusFilter}
              />
            </div>
            <TaskList
              tasks={filteredTasks}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <AnalyticsDashboard tasks={tasks} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
