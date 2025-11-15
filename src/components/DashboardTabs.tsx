import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const DashboardTabs = ({ activeTab, onTabChange, children }: DashboardTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full sm:w-auto justify-start bg-muted/50 p-1 mb-6">
        <TabsTrigger value="all" className="flex-1 sm:flex-none">All</TabsTrigger>
        <TabsTrigger value="lessons" className="flex-1 sm:flex-none">Lessons</TabsTrigger>
        <TabsTrigger value="score" className="flex-1 sm:flex-none">Score</TabsTrigger>
        <TabsTrigger value="progress" className="flex-1 sm:flex-none">Progress</TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

export default DashboardTabs;
