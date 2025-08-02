import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
            Live Poll
          </h1>
          <p className="text-muted-foreground">Choose your role to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-card group cursor-pointer hover:shadow-glow transition-all duration-300" 
                onClick={() => navigate('/teacher')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-primary/10 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-2xl">I'm a Teacher</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Create polls, ask questions, and view live results from your students
              </p>
              <Button variant="hero" className="w-full">
                Start Teaching
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-card group cursor-pointer hover:shadow-glow transition-all duration-300" 
                onClick={() => navigate('/student')}>
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-accent/10 rounded-full w-fit group-hover:bg-accent/20 transition-colors">
                <Users className="h-12 w-12 text-accent" />
              </div>
              <CardTitle className="text-2xl">I'm a Student</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Join a poll session and participate in real-time Q&A
              </p>
              <Button variant="hero" className="w-full bg-gradient-secondary">
                Join Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
