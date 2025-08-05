'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type StatusFilter = 'all' | 'incomplete' | 'completed';

interface TaskFiltersProps {
  currentFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
}

export function TaskFilters({
  currentFilter,
  onFilterChange,
}: TaskFiltersProps) {
  return (
    <Tabs
      defaultValue={currentFilter}
      onValueChange={(value) => onFilterChange(value as StatusFilter)}
    >
      <TabsList>
        <TabsTrigger value="all">All Tasks</TabsTrigger>
        <TabsTrigger value="incomplete">Incomplete</TabsTrigger>
        <TabsTrigger value="completed">Completed</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
