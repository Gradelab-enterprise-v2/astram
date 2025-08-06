
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ChevronRight, Check, BookOpen, BrainCircuit, Users, BarChart4 } from "lucide-react";
import { AstramLogo } from "@/components/ui/AstramLogo";

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-36 flex flex-col items-center justify-center bg-gradient-to-b from-background to-background/60">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  AI-Powered Education Assessment Platform
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  Transform the way you create, manage, and evaluate assessments with our cutting-edge AI technology.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white"
                  size="lg" 
                  onClick={() => navigate('/login')}
                >
                  Get Started
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-[500px] overflow-hidden rounded-xl border bg-background p-2 shadow-xl">
                <div className="rounded-lg bg-gradelab-blue/5 p-8">
                  <div className="grid gap-4">
                    <div className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm">
                      <BookOpen className="h-8 w-8 text-gradelab-blue" />
                      <div className="space-y-1">
                        <h3 className="font-semibold">Question Paper Generator</h3>
                        <p className="text-sm text-muted-foreground">Create custom question papers based on subject, topic and difficulty level</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-lg bg-card p-4 shadow-sm">
                      <BrainCircuit className="h-8 w-8 text-gradelab-green" />
                      <div className="space-y-1">
                        <h3 className="font-semibold">AI-Based Evaluation</h3>
                        <p className="text-sm text-muted-foreground">Automated assessment of handwritten answer sheets</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Features */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Features</div>
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Everything You Need</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                GradeLab provides a comprehensive suite of tools for educators to streamline their assessment workflow.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col justify-between rounded-lg border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">AI-Powered Question Generation</h3>
                <p className="text-sm text-muted-foreground">Generate question papers based on subject, topic, difficulty level, and Bloom's Taxonomy.</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Student Management</h3>
                <p className="text-sm text-muted-foreground">Manage student profiles, performance tracking, and batch-wise categorization.</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Automated Paper Checking</h3>
                <p className="text-sm text-muted-foreground">AI-powered OCR to evaluate handwritten answer sheets with high accuracy.</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <BarChart4 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Performance Analytics</h3>
                <p className="text-sm text-muted-foreground">Analyze papers based on Bloom's Taxonomy for cognitive skill assessment.</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Difficulty Level Mapping</h3>
                <p className="text-sm text-muted-foreground">Track question distribution and map them to learning outcomes.</p>
              </div>
            </div>
            <div className="flex flex-col justify-between rounded-lg border bg-card p-6 shadow-sm">
              <div className="space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Subject Details Management</h3>
                <p className="text-sm text-muted-foreground">Add/edit subjects, chapters, and topics with ease.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="w-full py-12 md:py-24 lg:py-32 border-t">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">Get Started Today</h2>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Join thousands of educators who are revolutionizing their assessment process with GradeLab.
              </p>
            </div>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              size="lg"
              onClick={() => navigate('/login')}
            >
              Start Now
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full border-t px-4 md:px-6">
        <div className="flex flex-col gap-4 items-center justify-between py-6 md:h-24 md:flex-row md:py-0">
          <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
                          <AstramLogo size="sm" />
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              © 2023 Astram. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
