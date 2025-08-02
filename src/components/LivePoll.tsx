import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Play, Plus, Square, Timer, Users } from "lucide-react";
import { useEffect, useState } from "react";

interface Poll {
  id: string;
  code: string;
  title: string;
  is_active: boolean;
}

interface Question {
  id: string;
  poll_id: string;
  question_text: string;
  options: string[];
  time_limit: number;
  is_active: boolean;
  started_at?: string;
  ended_at?: string;
}

interface Student {
  id: string;
  poll_id: string;
  name: string;
  joined_at: string;
}

interface Response {
  id: string;
  question_id: string;
  student_id: string;
  selected_option: number;
  submitted_at: string;
}

export const TeacherDashboard = () => {
  const [poll, setPoll] = useState<Poll | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [newQuestion, setNewQuestion] = useState({
    questionText: "",
    optionA: "",
    optionB: "",
    optionC: "",
    optionD: "",
    timeLimit: 60
  });
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const { toast } = useToast();

  // Real-time subscriptions
  useEffect(() => {
    if (!poll) return;

    // Subscribe to students
    const studentsChannel = supabase
      .channel('students')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'students', filter: `poll_id=eq.${poll.id}` }, 
        (payload) => {
          setStudents(prev => [...prev, payload.new as Student]);
        })
      .subscribe();

    // Subscribe to responses
    const responsesChannel = supabase
      .channel('responses')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'responses' }, 
        (payload) => {
          const response = payload.new as Response;
          if (currentQuestion && response.question_id === currentQuestion.id) {
            setResponses(prev => [...prev, response]);
          }
        })
      .subscribe();

    return () => {
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(responsesChannel);
    };
  }, [poll, currentQuestion]);

  // Timer effect
  useEffect(() => {
    if (timeLeft && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleEndQuestion();
    }
  }, [timeLeft]);

  const createPoll = async () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log("Creating poll with code:", code);
    
    const { data, error } = await supabase
      .from('polls')
      .insert({ 
        code, 
        title: 'Live Poll Session',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive"
      });
      return;
    }

    setPoll(data);
    toast({
      title: "Poll Created!",
      description: `Poll Code: ${code}`,
    });
  };

  const startQuestion = async () => {
    if (!poll || !newQuestion.questionText || !newQuestion.optionA || !newQuestion.optionB) {
      toast({
        title: "Error",
        description: "Please fill in question text and at least two options",
        variant: "destructive"
      });
      return;
    }

    // End previous question if active
    if (currentQuestion?.is_active) {
      await supabase
        .from('questions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('id', currentQuestion.id);
    }

    const options = [
      newQuestion.optionA,
      newQuestion.optionB,
      newQuestion.optionC,
      newQuestion.optionD
    ].filter(opt => opt.trim());

    const { data, error } = await supabase
      .from('questions')
      .insert({
        poll_id: poll.id,
        question_text: newQuestion.questionText,
        options,
        time_limit: newQuestion.timeLimit,
        is_active: true,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to start question",
        variant: "destructive"
      });
      return;
    }

    setCurrentQuestion({
      ...data,
      options: data.options as string[]
    });
    setResponses([]);
    setTimeLeft(newQuestion.timeLimit);
    
    // Reset form
    setNewQuestion({
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      timeLimit: 60
    });

    toast({
      title: "Question Started!",
      description: "Students can now submit their answers",
    });
  };

  const handleEndQuestion = async () => {
    if (!currentQuestion) return;

    await supabase
      .from('questions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', currentQuestion.id);

    setCurrentQuestion(prev => prev ? { ...prev, is_active: false } : null);
    setTimeLeft(null);
  };

  const getResultsData = () => {
    if (!currentQuestion) return [];
    
    const options = currentQuestion.options;
    
    return options.map((option, index) => ({
      option: String.fromCharCode(65 + index),
      text: option,
      count: responses.filter(r => r.selected_option === index).length,
      percentage: responses.length > 0 ? (responses.filter(r => r.selected_option === index).length / responses.length * 100) : 0
    }));
  };

  if (!poll) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-card animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
              Create Live Poll
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={createPoll} className="w-full" variant="hero">
              <Plus className="mr-2 h-4 w-4" />
              Start New Poll
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
                  Teacher Dashboard
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  Student Code: <Badge variant="secondary" className="ml-2 font-mono">{poll.code}</Badge>
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{students.length} students</span>
                </div>
                {timeLeft !== null && (
                  <div className="flex items-center gap-2 text-primary">
                    <Timer className="h-4 w-4" />
                    <span className="font-mono font-bold">{timeLeft}s</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Create Question */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Question
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Question</Label>
                <Textarea
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, questionText: e.target.value }))}
                  placeholder="Enter your question..."
                  className="mt-1"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Option A</Label>
                  <Input
                    value={newQuestion.optionA}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, optionA: e.target.value }))}
                    placeholder="Option A"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Option B</Label>
                  <Input
                    value={newQuestion.optionB}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, optionB: e.target.value }))}
                    placeholder="Option B"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Option C (Optional)</Label>
                  <Input
                    value={newQuestion.optionC}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, optionC: e.target.value }))}
                    placeholder="Option C"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Option D (Optional)</Label>
                  <Input
                    value={newQuestion.optionD}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, optionD: e.target.value }))}
                    placeholder="Option D"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Time Limit (seconds)</Label>
                <Input
                  type="number"
                  value={newQuestion.timeLimit}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 60 }))}
                  min="10"
                  max="300"
                  className="mt-1"
                />
              </div>

              <Button 
                onClick={startQuestion} 
                className="w-full" 
                variant="hero"
                disabled={currentQuestion?.is_active || !newQuestion.questionText || !newQuestion.optionA || !newQuestion.optionB}
              >
                <Play className="mr-2 h-4 w-4" />
                {currentQuestion?.is_active ? "Question Active" : "Start Question"}
              </Button>

              {currentQuestion?.is_active && (
                <Button 
                  onClick={handleEndQuestion} 
                  className="w-full" 
                  variant="destructive"
                >
                  <Square className="mr-2 h-4 w-4" />
                  End Question Early
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Live Results */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Live Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion ? (
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium">{currentQuestion.question_text}</p>
                  </div>
                  
                  <div className="space-y-3">
                    {getResultsData().map((result, index) => {
                      const optionColors = ['poll-a', 'poll-b', 'poll-c', 'poll-d'];
                      
                      return (
                        <div key={result.option} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{result.option}: {result.text}</span>
                            <span>{result.count} votes ({result.percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full bg-${optionColors[index]} transition-all duration-500 ease-out`}
                              style={{ width: `${result.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="text-center text-sm text-muted-foreground">
                    {responses.length} / {students.length} students responded
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No active question. Create and start a question to see live results.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export const StudentInterface = () => {
  const [studentName, setStudentName] = useState("");
  const [pollCode, setPollCode] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const { toast } = useToast();

  // Real-time subscription for questions
  useEffect(() => {
    if (!poll) return;

    const questionsChannel = supabase
      .channel('questions')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'questions',
        filter: `poll_id=eq.${poll.id}`
      }, (payload) => {
        const question = payload.new;
        if (question.is_active) {
          setCurrentQuestion({
            ...question,
            options: question.options as string[]
          } as Question);
          setTimeLeft(question.time_limit);
          setHasAnswered(false);
          setSelectedAnswer(null);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'questions',
        filter: `poll_id=eq.${poll.id}`
      }, (payload) => {
        const question = payload.new as Question;
        if (!question.is_active && currentQuestion?.id === question.id) {
          setCurrentQuestion(null);
          setTimeLeft(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(questionsChannel);
    };
  }, [poll, currentQuestion]);

  // Timer effect
  useEffect(() => {
    if (timeLeft && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setHasAnswered(true);
    }
  }, [timeLeft]);

  const joinPoll = async () => {
    if (!studentName.trim() || !pollCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name and poll code",
        variant: "destructive"
      });
      return;
    }

    // Find poll by code
    const code = pollCode.toUpperCase().trim();
    console.log("Searching for poll with code:", code);
    
    const { data: pollData, error: pollError } = await supabase
      .from('polls')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    
    if (pollError) {
      console.error("Database error:", pollError);
    }

    if (pollError || !pollData) {
      toast({
        title: "Error",
        description: "Poll not found. Please check the code.",
        variant: "destructive"
      });
      return;
    }

    // Join poll as student
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .insert({ poll_id: pollData.id, name: studentName })
      .select()
      .single();

    if (studentError) {
      toast({
        title: "Error",
        description: "Failed to join poll",
        variant: "destructive"
      });
      return;
    }

    setPoll(pollData);
    setStudent(studentData);
    setHasJoined(true);
    
    // Check for active question
    const { data: activeQuestion } = await supabase
      .from('questions')
      .select('*')
      .eq('poll_id', pollData.id)
      .eq('is_active', true)
      .maybeSingle();

    if (activeQuestion) {
      setCurrentQuestion({
        ...activeQuestion,
        options: activeQuestion.options as string[]
      });
      const elapsed = Math.floor((new Date().getTime() - new Date(activeQuestion.started_at!).getTime()) / 1000);
      const remaining = Math.max(0, activeQuestion.time_limit - elapsed);
      setTimeLeft(remaining);
    }

    toast({
      title: "Joined Poll!",
      description: `Welcome ${studentName}! Waiting for questions...`,
    });
  };

  const submitAnswer = async () => {
    if (selectedAnswer === null || !currentQuestion || !student) return;
    
    const { error } = await supabase
      .from('responses')
      .insert({
        question_id: currentQuestion.id,
        student_id: student.id,
        selected_option: selectedAnswer
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit answer",
        variant: "destructive"
      });
      return;
    }

    setHasAnswered(true);
    toast({
      title: "Answer Submitted!",
      description: `You selected option ${String.fromCharCode(65 + selectedAnswer!)}`,
    });
  };


  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-6">
        <Card className="w-full max-w-md shadow-card animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl bg-gradient-primary bg-clip-text text-transparent">
              Join Live Poll
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Your Name</Label>
              <Input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value.trim())}
                placeholder="Enter your name"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>Poll Code</Label>
              <Input
                value={pollCode}
                onChange={(e) => setPollCode(e.target.value.trim().toUpperCase())}
                placeholder="Enter poll code (e.g., ABC123)"
                className="mt-1 font-mono"
                required
                maxLength={6}
              />
            </div>
            <Button onClick={joinPoll} className="w-full" variant="hero">
              Join Poll
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-bg flex items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        {/* Student Header */}
        <Card className="shadow-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              Welcome, <span className="bg-gradient-primary bg-clip-text text-transparent">{studentName}</span>!
            </CardTitle>
            {timeLeft !== null && (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Timer className="h-5 w-5" />
                <span className="text-2xl font-mono font-bold">{timeLeft}s</span>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Question Card */}
        {currentQuestion ? (
          <Card className="shadow-card animate-slide-up">
            <CardHeader>
              <CardTitle className="text-center text-lg">
                {currentQuestion.question_text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!hasAnswered ? (
                <div className="space-y-3">
                  {currentQuestion.options.map((optionText, index) => {
                    const optionLetter = String.fromCharCode(65 + index);
                    
                    return (
                      <Button
                        key={index}
                        variant="poll"
                        className={`w-full justify-start ${
                          selectedAnswer === index ? 'ring-2 ring-primary bg-primary/10' : ''
                        }`}
                        onClick={() => setSelectedAnswer(index)}
                      >
                        <span className="font-bold mr-3">{optionLetter}.</span>
                        {optionText}
                      </Button>
                    );
                  })}
                  
                  <Button 
                    onClick={submitAnswer} 
                    className="w-full mt-6" 
                    variant="hero"
                    disabled={selectedAnswer === null}
                  >
                    Submit Answer
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">✓</div>
                  <p className="text-xl font-semibold mb-2">Answer Submitted!</p>
                  <p className="text-muted-foreground">
                    You selected option <Badge variant="secondary">{selectedAnswer !== null ? String.fromCharCode(65 + selectedAnswer) : ''}</Badge>
                  </p>
                  <p className="text-sm text-muted-foreground mt-4">
                    Waiting for results...
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-xl font-semibold mb-2">Waiting for Question</p>
              <p className="text-muted-foreground">
                Your teacher will start the next question soon...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};