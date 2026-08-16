import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Trophy,
  BarChart3,
  Users,
  TrendingUp,
} from "lucide-react";
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
    description:
      "Track your ESPN Fantasy Football league stats, view historical records, analyze matchups, and discover insights to dominate your league. Let's get you started!",
    icon: <Trophy className="h-8 w-8 text-primary" />,
  },
  {
    id: "connect",
    title: "Set Up or Join a League",
    description:
      "One commissioner connects ESPN with the League ID. Everyone else uses Join Team League with the commissioner's invite code. No browser cookies or developer tools are needed.",
    icon: <Users className="h-8 w-8 text-primary" />,
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description:
      "Your dashboard shows every league shared with you. Open a league for standings, weekly matchups, available players, weather, and team stats. Commissioners can refresh ESPN anytime.",
    icon: <BarChart3 className="h-8 w-8 text-primary" />,
  },
  {
    id: "features",
    title: "Explore Current and Past Seasons",
    description:
      "Commissioners can import past standings and champions. Weekly scores appear only when ESPN provides them, and career totals wait until renamed teams and co-managers have been reviewed.",
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
            className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-50 mx-auto w-full max-w-lg px-3 sm:px-4"
          >
            <Card className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-2 border-primary/20 shadow-2xl">
              <CardHeader className="relative p-5 sm:p-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 sm:right-4 sm:top-4"
                  onClick={handleSkip}
                >
                  <X className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full bg-primary/10 flex items-center justify-center [&_svg]:h-6 [&_svg]:w-6 sm:[&_svg]:h-8 sm:[&_svg]:w-8">
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

                <CardTitle className="text-xl sm:text-2xl">
                  {currentStepData.title}
                </CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  {currentStepData.description}
                </CardDescription>
              </CardHeader>

              <CardFooter className="flex flex-col-reverse items-stretch gap-2 p-5 pt-0 sm:flex-row sm:justify-between sm:p-6 sm:pt-0">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-muted-foreground"
                >
                  Skip Tutorial
                </Button>

                <div className="flex gap-2 sm:justify-end">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="flex-1 sm:flex-none"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}

                  <Button onClick={handleNext} className="flex-1 sm:flex-none">
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
