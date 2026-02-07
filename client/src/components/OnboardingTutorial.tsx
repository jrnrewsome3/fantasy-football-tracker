import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft, Trophy, BarChart3, Users, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  targetElement?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: "welcome",
    title: "Welcome to Trouble in Paradise!",
    description: "Track your ESPN Fantasy Football league stats, view historical records, analyze matchups, and discover insights to dominate your league. Let's get you started!",
    icon: <Trophy className="h-8 w-8 text-primary" />,
  },
  {
    id: "connect",
    title: "Connect Your ESPN League",
    description: "First, you'll need to connect your ESPN Fantasy Football league. Click 'Add League' to enter your league ID and credentials. You can find these in your ESPN league settings.",
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "After connecting, your dashboard shows all your leagues. Click 'View League' to see standings, weekly matchups, and team stats. Use the 'Sync Data' button to refresh from ESPN anytime.",
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
  },
  {
    id: "features",
    title: "Explore Powerful Features",
    description: "Navigate between tabs to view Current Week matchups, All-Time Stats with career records, and the Head-to-Head Matrix showing rivalry records. Track your league's history across seasons!",
    icon: <TrendingUp className="h-8 w-8 text-primary" />,
  },
];

const TUTORIAL_STORAGE_KEY = "ff-tracker-tutorial-completed";

export default function OnboardingTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has completed tutorial
    const completed = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (!completed) {
      // Show tutorial after a brief delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(TUTORIAL_STORAGE_KEY, "true");
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  const currentStepData = tutorialSteps[currentStep];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleSkip}
          />

          {/* Tutorial Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg px-4"
          >
            <Card className="border-2 border-primary/20 shadow-2xl">
              <CardHeader className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-4"
                  onClick={handleSkip}
                >
                  <X className="h-4 w-4" />
                </Button>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {currentStepData.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-1">
                      Step {currentStep + 1} of {tutorialSteps.length}
                    </div>
                    <div className="flex gap-1">
                      {tutorialSteps.map((_, index) => (
                        <div
                          key={index}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            index <= currentStep ? "bg-primary" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <CardTitle className="text-2xl">{currentStepData.title}</CardTitle>
                <CardDescription className="text-base">
                  {currentStepData.description}
                </CardDescription>
              </CardHeader>

              <CardFooter className="flex justify-between gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Skip Tutorial
                </Button>

                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button variant="outline" onClick={handlePrevious}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}
                  
                  <Button onClick={handleNext}>
                    {currentStep < tutorialSteps.length - 1 ? (
                      <>
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      "Get Started"
                    )}
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to restart tutorial
export function useRestartTutorial() {
  return () => {
    localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    window.location.reload();
  };
}
