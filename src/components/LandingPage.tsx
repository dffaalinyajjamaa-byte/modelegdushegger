import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { Spotlight } from '@/components/ui/spotlight';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MorphingText } from '@/components/ui/morphing-text';
import logo from '@/assets/model-egdu-logo.png';
import classroom1 from '@/assets/classroom-1.png';
import classroom2 from '@/assets/classroom-2.png';
import classroom3 from '@/assets/classroom-3.png';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const classroomImages = [classroom1, classroom2, classroom3];

const morphingTexts = [
  "Barnoonni humnadha.",
  "Beekumsi furtuu egereeti."
];

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const imageInterval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % classroomImages.length);
    }, 4000);

    return () => {
      clearInterval(imageInterval);
    };
  }, []);
  return (
    <div className="min-h-screen w-full overflow-y-auto overflow-x-hidden">
      <BackgroundPaths 
        title="Model Egdu" 
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
                alt="Model Egdu"
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

                  {/* Right: Auto-scrolling image carousel with bilingual headlines */}
                  <div className="flex-1 relative bg-gradient-to-br from-red-500/20 via-black to-red-900/30 flex flex-col items-center justify-center overflow-hidden p-6">
                    {/* Auto-scrolling Images */}
                    <div className="relative w-full h-48 md:h-56 mb-4 rounded-xl overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={currentImageIndex}
                          src={classroomImages[currentImageIndex]}
                          alt="Classroom"
                          className="absolute inset-0 w-full h-full object-cover rounded-xl"
                          initial={{ opacity: 0, scale: 1.1 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.7 }}
                        />
                      </AnimatePresence>
                      
                      {/* Image indicators */}
                      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
                        {classroomImages.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all ${
                              idx === currentImageIndex ? 'bg-red-500 w-4' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Morphing Text Headlines */}
                    <div className="h-20 flex items-center justify-center px-4">
                      <MorphingText 
                        texts={morphingTexts} 
                        className="text-lg md:text-xl text-white"
                      />
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
                      alt="Model Egdu" 
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
              <div className="w-full h-full bg-gradient-to-br from-red-500/20 via-white/10 to-black/20 rounded-2xl flex items-center justify-center p-8">
                <MorphingText 
                  texts={morphingTexts} 
                  className="text-2xl md:text-4xl text-white"
                />
              </div>
            </ContainerScroll>
          </div>
        </div>
      </BackgroundPaths>
    </div>
  );
}
