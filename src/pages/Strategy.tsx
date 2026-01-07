import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Compass, Target, CheckCircle } from 'lucide-react';

const principles = [
  { num: 1, title: 'Position Before Action', desc: 'If a move does not increase access, ownership, or leverage, I don\'t make it.' },
  { num: 2, title: 'Ownership Over Income', desc: 'I do not trade time for money. If I don\'t own a piece of the upside, I\'m working for someone else.' },
  { num: 3, title: 'Leverage Is My Only Engine', desc: 'My energy is a fuse, not a battery. It only works when attached to explosives.' },
  { num: 4, title: 'Systems Run Me — Not Emotion', desc: 'I do not rely on motivation. If something lives in my head, it\'s not real.' },
  { num: 5, title: 'Slow Decisions, Fast Execution', desc: 'Urgency is usually ego in disguise. Execute only after risk is understood.' },
  { num: 6, title: 'If I Can\'t Repeat It, I Don\'t Build It', desc: 'I build structures, not one-offs. If it doesn\'t compound, I walk away.' },
  { num: 7, title: 'People Are My Leverage', desc: 'Relationships compound or decay — there is no neutral. I cut noise ruthlessly.' },
  { num: 8, title: 'Pain = Data', desc: 'I do not react emotionally to pain. I extract a principle, update the system, and evolve.' },
  { num: 9, title: 'Signal Over Visibility', desc: 'My brand is quiet trust. If people talk about my thinking when I\'m not in the room — I\'ve won.' },
  { num: 10, title: 'Play the Long Game', desc: 'I trade wide freedom now for asymmetric freedom later. I am here to win big, not small.' },
];

const roadmap = [
  { year: 2026, theme: 'Positioning', goal: 'Become trusted capital allocator & ecosystem gatekeeper', status: 'current' },
  { year: 2027, theme: 'Ownership', goal: '10-20 equity/carry positions in promising startups', status: 'future' },
  { year: 2028, theme: 'Platform', goal: 'Formalize into fund, syndicate, or capital vehicle', status: 'future' },
  { year: 2029, theme: 'Scale', goal: 'Scale access without scaling effort', status: 'future' },
  { year: 2030, theme: 'Concentration', goal: 'Double down on top 5-10% with 100x potential', status: 'future' },
  { year: '2031-35', theme: 'Asymmetry', goal: 'Compound without daily involvement', status: 'future' },
];

export default function Strategy() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Strategy & Principles</h1>
        <p className="text-muted-foreground">Your operating system — principles visible, strategy on track</p>
      </div>

      {/* Big Goal */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Target className="h-8 w-8 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">15-Year Vision</p>
              <p className="text-xl font-bold mt-1">Become a billionaire by holding a high-leverage position</p>
              <p className="text-muted-foreground mt-2">Compound ownership, access, and capital over time — without being trapped in execution.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap */}
      <Card className="bg-card border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2"><Compass className="h-5 w-5 text-primary" />The No-Skip Ladder (2026–2035)</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {roadmap.map((r, i) => (
              <div key={i} className={`flex items-center gap-4 p-4 rounded-lg ${r.status === 'current' ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}>
                <div className={`w-16 text-center font-bold ${r.status === 'current' ? 'text-primary' : 'text-muted-foreground'}`}>{r.year}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{r.theme}</span>
                    {r.status === 'current' && <Badge className="bg-primary">Current</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{r.goal}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Principles */}
      <Card className="bg-card border-border/50">
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-accent" />10 Operating Principles</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {principles.map(p => (
              <div key={p.num} className="p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-sm font-bold flex items-center justify-center">{p.num}</span>
                  <div>
                    <p className="font-semibold text-sm">{p.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
