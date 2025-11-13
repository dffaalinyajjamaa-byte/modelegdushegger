import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { Button } from '@/components/ui/button';
import logo from '@/assets/oro-logo.png';
import { motion } from 'framer-motion';

export default function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <div className="relative">
      {/* Hero section with animated background */}
      <BackgroundPaths title="Oro Digital School" />
      
      {/* Scroll animation section */}
      <div className="flex flex-col overflow-hidden">
        <ContainerScroll
          titleComponent={
            <>
              <motion.div 
                className="flex justify-center mb-8"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, type: "spring" }}
              >
                <img 
                  src={logo} 
                  alt="Oro Digital School" 
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full shadow-2xl"
                />
              </motion.div>
              
              <h1 className="text-4xl md:text-5xl font-semibold text-black dark:text-white">
                Learn Smarter with <br />
                <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Digital Education
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground mt-4 max-w-2xl mx-auto">
                Access Grade 8 courses, take exams, chat with AI teachers, and connect with classmates
              </p>
              
              <Button
                onClick={onGetStarted}
                size="lg"
                className="mt-8 rounded-full px-12 py-6 text-lg"
              >
                Get Started
              </Button>
            </>
          }
        >
          {/* App preview mockup */}
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center">
            <img 
              src={logo} 
              alt="App Preview" 
              className="w-64 h-64 object-contain opacity-50"
            />
          </div>
        </ContainerScroll>
      </div>
    </div>
  );
}
