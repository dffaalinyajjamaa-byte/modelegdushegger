import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Home, Play, Trophy, TrendingUp } from 'lucide-react';

interface DashboardTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

const DashboardTabs = ({ activeTab, onTabChange, children }: DashboardTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="w-full sm:w-auto justify-start bg-background/50 backdrop-blur-sm p-1.5 mb-6 rounded-full border border-border/50">
        <TabsTrigger 
          value="all" 
          className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <Home className="w-4 h-4 mr-2" />
          All
        </TabsTrigger>
        <TabsTrigger 
          value="lessons" 
          className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <Play className="w-4 h-4 mr-2" />
          Lessons
        </TabsTrigger>
        <TabsTrigger 
          value="score" 
          className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <Trophy className="w-4 h-4 mr-2" />
          Score
        </TabsTrigger>
        <TabsTrigger 
          value="progress" 
          className="flex-1 sm:flex-none rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-300 hover:scale-105"
        >
          <TrendingUp className="w-4 h-4 mr-2" />
          Progress
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

export default DashboardTabs;
