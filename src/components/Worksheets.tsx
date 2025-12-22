import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, FileText, BookOpen, Calculator, Globe, Users, Flag, ScrollText, Languages, Atom, X, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface WorksheetsProps {
  user: User;
  onBack: () => void;
}

interface Worksheet {
  id: string;
  title: string;
  driveUrl: string;
}

interface Subject {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  worksheets: Worksheet[];
}

const subjects: Subject[] = [
  {
    id: 'english',
    name: 'English',
    icon: Languages,
    color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
    worksheets: [
      { id: 'en1', title: 'Worksheet 1', driveUrl: '1NM_6NC9KgEsRSkg-ZnVYR6ax5b8gK0Rs' },
      { id: 'en2', title: 'Worksheet 2', driveUrl: '1gpmCAn3HE4PnAIxJRmnm2ZwQMdvf_nMF' },
      { id: 'en3', title: 'Worksheet 3', driveUrl: '1Kt5oRckGH70qZ3aDrzhvOhSIkbVWkDeN' },
      { id: 'en4', title: 'Worksheet 4', driveUrl: '1gp21KzOOLhHiqT2bBQHx7Eafs6IqUvLA' },
      { id: 'en5', title: 'Worksheet 5', driveUrl: '1ktzpAieYIAqSdneWfjLPsLKWxg-5kVZT' },
      { id: 'en6', title: 'Worksheet 6', driveUrl: '1-XhvwM0iuCR4NSn1CJMW3Hiq-tWQuJ07' },
    ]
  },
  {
    id: 'afaan-oromoo',
    name: 'Afaan Oromoo',
    icon: BookOpen,
    color: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    worksheets: [
      { id: 'ao1', title: 'Worksheet 1', driveUrl: '11AlkSIgr1Vl1FKGtJEq9IErwJPl-ThrA' },
      { id: 'ao2', title: 'Worksheet 2', driveUrl: '1QzEPGmuo7fDFRsVkSsvkZ2jcDQ7jcO87' },
      { id: 'ao3', title: 'Worksheet 3', driveUrl: '1J4NCGkI3Br78yt6RrlVhaFenfiVjTP7q' },
      { id: 'ao4', title: 'Worksheet 4', driveUrl: '1JU_UeXqrawkvveZ7LPxJDzdc6QyPe8SK' },
    ]
  },
  {
    id: 'saayinsi',
    name: 'Saayinsi Waliigalaa',
    icon: Atom,
    color: 'from-cyan-500/20 to-teal-500/20 border-cyan-500/30',
    worksheets: [
      { id: 'sw1', title: 'Worksheet 1', driveUrl: '1Hs6EJpR6E0O8Y3PSz6_9jDm_gjYMy1Or' },
      { id: 'sw2', title: 'Worksheet 2', driveUrl: '1B5PJ-odafMKwVaAwF012ZZXjp2zkBsXm' },
      { id: 'sw3', title: 'Worksheet 3', driveUrl: '1cmEH7xp7gMWDFHqzNMw5nb0URXAvoQ8a' },
      { id: 'sw4', title: 'Worksheet 4 (1500 Questions)', driveUrl: '15sNjVgYvb_Zm7VwIeQlfSUGFTQ1lhZsb' },
    ]
  },
  {
    id: 'herrega',
    name: 'Herrega',
    icon: Calculator,
    color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30',
    worksheets: [
      { id: 'hr1', title: 'Worksheet 1', driveUrl: '1_nOGwWUUXn42KJ909z-9bXTHYlZqVvlz' },
      { id: 'hr2', title: 'Worksheet 2', driveUrl: '1o5g7svLAc4TglcK7I54xMjk2ixnYXm6-' },
      { id: 'hr3', title: 'Worksheet 3', driveUrl: '1D6nsm1v7dPGRgqvHowv0YW2W4R9ITyiO' },
      { id: 'hr4', title: 'Worksheet 4', driveUrl: '16bNuftT9GjX2cUERRRw775CSPLQNZtS1' },
      { id: 'hr5', title: 'Worksheet 5', driveUrl: '1qdNU6MzhQ65zdhM2Oh0KzQ4zc-382tZz' },
      { id: 'hr6', title: 'Worksheet 6', driveUrl: '1Ynbw29CFGq5DLNhXDiKPCM__T6P0kMxU' },
    ]
  },
  {
    id: 'hawaasa',
    name: 'Hawaasa',
    icon: Globe,
    color: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
    worksheets: [
      { id: 'hw1', title: 'Worksheet 1', driveUrl: '1tyttp6PQgqg-tS9xtPZPbHt-ApD-QmFr' },
      { id: 'hw2', title: 'Worksheet 2', driveUrl: '1MxO2GIC4fgF1zMZG8rJCcn-oBdOyxQGM' },
      { id: 'hw3', title: 'Worksheet 3', driveUrl: '1l-GLJ_ESF9_Ow5D7TDb46ufSeqbtQeNm' },
      { id: 'hw4', title: 'Worksheet 4', driveUrl: '1tyttp6PQgqg-tS9xtPZPbHt-ApD-QmFr' },
    ]
  },
  {
    id: 'amariffaa',
    name: 'Amariffaa',
    icon: ScrollText,
    color: 'from-red-500/20 to-rose-500/20 border-red-500/30',
    worksheets: [
      { id: 'am1', title: 'Worksheet 1', driveUrl: '1vwHdrcDyEp2H6c28r1dUj9rwGW_l4vU1' },
      { id: 'am2', title: 'Worksheet 2', driveUrl: '1ipneuk8_wdQLhBvDJQa9MSlKAEFPkwCt' },
    ]
  },
  {
    id: 'gadaa',
    name: 'Gadaa',
    icon: Users,
    color: 'from-yellow-500/20 to-lime-500/20 border-yellow-500/30',
    worksheets: [
      { id: 'gd1', title: 'Worksheet 1', driveUrl: '1cw-PSefaHQHs8b4xY6z7m42JxxwJIKFJ' },
      { id: 'gd2', title: 'Worksheet 2', driveUrl: '1BL2Vh2MvSac_51AZvbILESDWsIkxrj0D' },
      { id: 'gd3', title: 'Worksheet 3', driveUrl: '1G43GnJZaAgaVDyCoHiVwOabOqMqJfh-8' },
    ]
  },
  {
    id: 'lammummaa',
    name: 'Lammummaa',
    icon: Flag,
    color: 'from-pink-500/20 to-fuchsia-500/20 border-pink-500/30',
    worksheets: [
      { id: 'lm1', title: 'Worksheet 1', driveUrl: '1mWJPWyDicb6coILrCSzYqplWqqolR6HU' },
      { id: 'lm2', title: 'Worksheet 2', driveUrl: '1YTHrER93-EDGjXakLwO9Efmgo0JbY_3j' },
    ]
  },
];

export default function Worksheets({ user, onBack }: WorksheetsProps) {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedWorksheet, setSelectedWorksheet] = useState<Worksheet | null>(null);

  const getGoogleDriveEmbedUrl = (fileId: string) => {
    return `https://drive.google.com/file/d/${fileId}/preview`;
  };

  // Viewing a specific worksheet
  if (selectedWorksheet && selectedSubject) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Button variant="ghost" size="sm" onClick={() => setSelectedWorksheet(null)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h2 className="text-lg font-semibold truncate flex-1 mx-4">
              {selectedSubject.name} - {selectedWorksheet.title}
            </h2>
            <a
              href={`https://drive.google.com/file/d/${selectedWorksheet.driveUrl}/view`}
              target="_blank"
              rel="noopener noreferrer"
              className="mr-2"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                Open
              </Button>
            </a>
            <Button variant="ghost" size="icon" onClick={() => setSelectedWorksheet(null)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1">
            <iframe
              src={getGoogleDriveEmbedUrl(selectedWorksheet.driveUrl)}
              title={selectedWorksheet.title}
              className="w-full h-full"
              allow="autoplay"
            />
          </div>
        </div>
      </div>
    );
  }

  // Viewing worksheets in a subject
  if (selectedSubject) {
    const IconComponent = selectedSubject.icon;
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => setSelectedSubject(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-gradient-to-br ${selectedSubject.color}`}>
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{selectedSubject.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {selectedSubject.worksheets.length} Worksheets
                </p>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedSubject.worksheets.map((worksheet) => (
                <Card
                  key={worksheet.id}
                  className="group cursor-pointer p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => setSelectedWorksheet(worksheet)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${selectedSubject.color}`}>
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{worksheet.title}</h3>
                      <p className="text-sm text-muted-foreground">PDF Document</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Main subjects view
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20">
              <FileText className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Worksheets</h1>
              <p className="text-sm text-muted-foreground">Practice Materials</p>
            </div>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {subjects.map((subject) => {
              const IconComponent = subject.icon;
              return (
                <Card
                  key={subject.id}
                  className={`group cursor-pointer p-6 border-2 ${subject.color} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}
                  onClick={() => setSelectedSubject(subject)}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${subject.color}`}>
                      <IconComponent className="w-10 h-10" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{subject.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {subject.worksheets.length} worksheets
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
