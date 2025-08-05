'use client';

import { useState, useMemo, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TaskFlowLogo } from '@/components/task-flow-logo';
import { AddTaskDialog } from '@/components/add-task-dialog';
import { TaskList } from '@/components/task-list';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { TaskFilters, type StatusFilter } from '@/components/task-filters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Task } from '@/lib/types';

function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
    }
  }, [key, storedValue]);


  return [storedValue, setStoredValue];
}


export function TaskFlowPage() {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', []);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const addTask = (task: Omit<Task, 'id' | 'completed' | 'completedAt'>) => {
    const newTask: Task = {
      ...task,
      id: uuidv4(),
      completed: false,
    };
    setTasks((prevTasks) => [...prevTasks, newTask]);
  };

  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (statusFilter === 'completed') return task.completed;
        if (statusFilter === 'incomplete') return !task.completed;
        return true;
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
          <AddTaskDialog addTask={addTask} />
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
