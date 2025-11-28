import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { Spotlight } from '@/components/ui/spotlight';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import logo from '@/assets/oro-logo.png';
import { motion } from 'framer-motion';
import { BookOpen, GraduationCap, Brain } from 'lucide-react';

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="min-h-screen w-full overflow-y-auto overflow-x-hidden">
      <BackgroundPaths 
        title="Oro Digital School" 
        onButtonClick={onGetStarted}
        showButton={true}
      >
        {/* Logo with Afaan Oromo text and 3D Scene */}
        <div className="relative z-10 py-20">
          <div className="container mx-auto px-4">
            {/* Logo and tagline */}
            <motion.div 
              className="flex flex-col items-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <img 
                src={logo} 
                alt="Oro Digital School"
                className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-2xl border-4 border-red-500 mb-4"
              />
              <p className="text-xl md:text-2xl font-bold text-center bg-gradient-to-r from-red-500 via-white to-black dark:to-white bg-clip-text text-transparent px-4">
                Lammiin Barate Gaaffii Mirgaa Gaafata
              </p>
            </motion.div>

            {/* 3D Spline Scene */}
            <div className="max-w-5xl mx-auto mb-12">
              <Card className="overflow-hidden bg-black/95 border-red-500/50 rounded-3xl">
                <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="red" />
                
                <div className="flex flex-col md:flex-row h-[500px]">
                  {/* Left: Text content */}
                  <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                      <span className="text-red-500">Learn</span>
                      <span className="text-white"> Smart</span>
                      <span className="text-black dark:text-white"> Today</span>
                    </h1>
                    
                    <p className="mt-4 text-gray-300 max-w-lg">
                      Experience the future of education with AI-powered learning, 
                      interactive 3D content, and personalized study paths.
                    </p>
                    
                    <Button
                      onClick={onGetStarted}
                      size="lg"
                      className="mt-6 bg-red-500 hover:bg-red-600 text-white rounded-full px-8 w-fit"
                    >
                      Start Learning
                    </Button>
                  </div>

                  {/* Right: Visual with gradient and educational icons */}
                  <div className="flex-1 relative bg-gradient-to-br from-red-500/20 via-black to-red-900/30 flex items-center justify-center">
                    <div className="text-center">
                      <motion.img 
                        src={logo} 
                        alt="Oro" 
                        className="w-32 h-32 rounded-full shadow-2xl border-4 border-red-500/50 mx-auto"
                        animate={{ 
                          boxShadow: [
                            "0 0 20px rgba(239, 68, 68, 0.5)",
                            "0 0 40px rgba(239, 68, 68, 0.8)",
                            "0 0 20px rgba(239, 68, 68, 0.5)"
                          ]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <motion.div 
                        className="mt-6 flex gap-4 justify-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        <BookOpen className="w-10 h-10 text-red-400" />
                        <GraduationCap className="w-10 h-10 text-white" />
                        <Brain className="w-10 h-10 text-red-400" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      
        {/* Scroll Animation Section */}
        <div className="relative z-10 pb-20">
          <div className="container mx-auto px-4">
            <ContainerScroll
              titleComponent={
                <>
                  <motion.div 
                    className="flex justify-center mb-8"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.8 }}
                  >
                    <img 
                      src={logo} 
                      alt="App Preview" 
                      className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-2xl border-4 border-primary"
                    />
                  </motion.div>
                  
                  <h2 className="text-3xl md:text-5xl font-bold mb-4">
                    <span className="bg-gradient-to-r from-red-500 via-white to-black dark:to-white bg-clip-text text-transparent">
                      Digital Education Platform
                    </span>
                  </h2>
                  
                  <p className="text-lg text-muted-foreground mt-4">
                    Grade 8 courses, AI teachers, and collaborative learning
                  </p>
                </>
              }
            >
              <div className="w-full h-full bg-gradient-to-br from-red-500/20 via-white/10 to-black/20 rounded-2xl flex items-center justify-center">
                <img src={logo} alt="Preview" className="w-48 h-48 object-contain opacity-70" />
              </div>
            </ContainerScroll>
          </div>
        </div>
      </BackgroundPaths>
    </div>
  );
}
