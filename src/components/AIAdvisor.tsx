import { useState } from 'react';
import { useAIEvaluator } from '@/hooks/useAIEvaluator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Send, Loader2, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAdvisor() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { chat, isLoading } = useAIEvaluator();

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    const response = await chat(userMessage);
    if (response) {
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    }
  };

  const suggestedQuestions = [
    "What patterns do I see in my winning deals?",
    "What should I avoid based on my past misses?",
    "How should I evaluate a fintech startup?",
    "What's my ideal deal profile?",
  ];

  return (
    <Card className="bg-card border-border/50 h-[500px] flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          AI Investment Advisor
        </CardTitle>
        <p className="text-xs text-muted-foreground">Trained on your deal history and investment philosophy</p>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 pr-4 -mr-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-primary/50 mb-4" />
                <p className="text-sm text-muted-foreground mb-4">Ask me anything about deal evaluation</p>
              </div>
              <div className="space-y-2">
                {suggestedQuestions.map((q, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start text-left h-auto py-2 text-xs"
                    onClick={() => { setInput(q); }}
                  >
                    {q}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about deals, patterns, or strategy..."
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
