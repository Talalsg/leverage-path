import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Rocket, Send, Upload, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  // Founder Info
  fullName: z.string().min(2, "Full name is required"),
  role: z.string().min(2, "Role/Title is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  founderLinkedIn: z.string().url("Valid LinkedIn URL required"),
  cofounderLinkedIn: z.string().optional(),
  
  // Company Info
  companyName: z.string().min(2, "Company name is required"),
  companyLinkedIn: z.string().optional(),
  headquarters: z.string().min(2, "Headquarters is required"),
  yearFounded: z.string().regex(/^\d{4}$/, "Enter year as YYYY"),
  companyStage: z.string().min(1, "Company stage is required"),
  primaryIndustry: z.string().min(1, "Industry is required"),
  
  // Description
  oneSentence: z.string().max(200, "Max 25 words").min(10, "Description required"),
  companyDescription: z.string().max(1500, "Max 200 words").min(20, "Description required"),
  targetCustomer: z.string().min(1, "Target customer is required"),
  keyInsight: z.string().max(150, "Max 20 words").min(5, "Key insight required"),
  
  // Traction
  currentRevenue: z.string().min(1, "Revenue range is required"),
  tractionHighlights: z.string().optional(),
  
  // Team
  foundingStructure: z.string().min(1, "Founding structure is required"),
  teamSize: z.string().regex(/^\d+$/, "Enter a number"),
  teamRoles: z.string().min(2, "Team roles required"),
  
  // Funding
  isRaising: z.string().min(1, "Required"),
  currentRound: z.string().optional(),
  targetRaise: z.string().optional(),
  existingInvestors: z.string().optional(),
  lookingFor: z.array(z.string()).optional(),
  nextGoals: z.string().optional(),
  
  // Saudi
  saudiOperating: z.string().min(1, "Required"),
  
  // Other
  anythingElse: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const stages = [
  "Idea / Concept",
  "Pre-Seed",
  "Seed",
  "Series A",
  "Series B",
  "Series C+",
];

const industries = [
  "Fintech",
  "Healthtech / Biotech",
  "AI / Machine Learning",
  "SaaS / Enterprise Software",
  "E-commerce / Retail",
  "Edtech",
  "Proptech / Real Estate",
  "Logistics / Supply Chain",
  "Climate / Cleantech",
  "Consumer / D2C",
  "Gaming / Entertainment",
  "Other",
];

const headquarters = [
  "Saudi Arabia",
  "UAE",
  "Egypt",
  "Jordan",
  "Other MENA",
  "USA",
  "Europe",
  "Asia",
  "Other",
];

const targetCustomers = [
  "SMBs",
  "Enterprises",
  "Consumers (B2C)",
  "Developers",
  "Government / Public Sector",
  "Other",
];

const revenueRanges = [
  "$0 (Pre-revenue)",
  "$1 - $10K MRR",
  "$10K - $50K MRR",
  "$50K - $100K MRR",
  "$100K+ MRR",
];

const foundingStructures = [
  "Solo Founder",
  "2 Co-founders",
  "3+ Co-founders",
];

const roundTypes = [
  "Pre-Seed",
  "Seed",
  "Series A",
  "Bridge / Extension",
];

const raiseRanges = [
  "< $500K",
  "$500K - $1M",
  "$1M - $3M",
  "$3M - $5M",
  "$5M+",
];

const lookingForOptions = [
  "Capital",
  "Strategic introductions",
  "Mentorship / Guidance",
  "Saudi market access",
  "Hiring support",
];

export default function StartupIntake() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [pitchDeck, setPitchDeck] = useState<File | null>(null);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      setPitchDeck(file);
    }
  };

  const toggleLookingFor = (option: string) => {
    setLookingFor((prev) =>
      prev.includes(option)
        ? prev.filter((o) => o !== option)
        : [...prev, option]
    );
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      // Upload pitch deck if provided
      let deckUrl = null;
      if (pitchDeck) {
        const fileName = `intake/${Date.now()}-${pitchDeck.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("deal-documents")
          .upload(fileName, pitchDeck);

        if (uploadError) {
          console.error("Upload error:", uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from("deal-documents")
            .getPublicUrl(fileName);
          deckUrl = urlData.publicUrl;
        }
      }

      // Call edge function to create records
      const { data: result, error } = await supabase.functions.invoke("startup-intake", {
        body: {
          ...data,
          lookingFor,
          pitchDeckUrl: deckUrl,
        },
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: "Thank you for your submission. We'll review it shortly.",
      });
    } catch (error) {
      console.error("Submission error:", error);
      toast({
        title: "Submission Failed",
        description: "Please try again or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-muted-foreground">
              Your startup application has been submitted successfully. Due to volume, we may only respond to startups that are a fit.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Rocket className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Startup Intake Form</h1>
          </div>
          <p className="text-muted-foreground">
            Due to volume, we may only respond to startups that are a fit.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Founder Information */}
          <Card>
            <CardHeader>
              <CardTitle>Founder Information</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" {...register("fullName")} />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role / Title *</Label>
                  <Input id="role" placeholder="e.g. CEO, Co-founder" {...register("role")} />
                  {errors.role && (
                    <p className="text-sm text-destructive">{errors.role.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (optional)</Label>
                  <Input id="phone" type="tel" {...register("phone")} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="founderLinkedIn">Founder LinkedIn Profile *</Label>
                  <Input id="founderLinkedIn" placeholder="https://linkedin.com/in/..." {...register("founderLinkedIn")} />
                  {errors.founderLinkedIn && (
                    <p className="text-sm text-destructive">{errors.founderLinkedIn.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cofounderLinkedIn">Co-Founder LinkedIn (optional)</Label>
                  <Input id="cofounderLinkedIn" placeholder="https://linkedin.com/in/..." {...register("cofounderLinkedIn")} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Tell us about your startup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input id="companyName" {...register("companyName")} />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">{errors.companyName.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyLinkedIn">Company LinkedIn</Label>
                  <Input id="companyLinkedIn" placeholder="https://linkedin.com/company/..." {...register("companyLinkedIn")} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Headquarters *</Label>
                  <Select onValueChange={(v) => setValue("headquarters", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {headquarters.map((hq) => (
                        <SelectItem key={hq} value={hq}>{hq}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.headquarters && (
                    <p className="text-sm text-destructive">{errors.headquarters.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearFounded">Year Founded (YYYY) *</Label>
                  <Input id="yearFounded" placeholder="2024" maxLength={4} {...register("yearFounded")} />
                  {errors.yearFounded && (
                    <p className="text-sm text-destructive">{errors.yearFounded.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Stage *</Label>
                  <Select onValueChange={(v) => setValue("companyStage", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.companyStage && (
                    <p className="text-sm text-destructive">{errors.companyStage.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Primary Industry *</Label>
                  <Select onValueChange={(v) => setValue("primaryIndustry", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((ind) => (
                        <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.primaryIndustry && (
                    <p className="text-sm text-destructive">{errors.primaryIndustry.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Company Description */}
          <Card>
            <CardHeader>
              <CardTitle>About Your Company</CardTitle>
              <CardDescription>Help us understand your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="oneSentence">
                  One-sentence description (What you do, for whom, and why it matters) *
                </Label>
                <Textarea
                  id="oneSentence"
                  placeholder="Max 25 words"
                  className="min-h-[80px]"
                  {...register("oneSentence")}
                />
                {errors.oneSentence && (
                  <p className="text-sm text-destructive">{errors.oneSentence.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyDescription">
                  Company Description (Problem, solution, differentiation) *
                </Label>
                <Textarea
                  id="companyDescription"
                  placeholder="Max 200 words - What problem are you solving, for whom, and how is your solution different?"
                  className="min-h-[150px]"
                  {...register("companyDescription")}
                />
                {errors.companyDescription && (
                  <p className="text-sm text-destructive">{errors.companyDescription.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Target Customer *</Label>
                <Select onValueChange={(v) => setValue("targetCustomer", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetCustomers.map((tc) => (
                      <SelectItem key={tc} value={tc}>{tc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.targetCustomer && (
                  <p className="text-sm text-destructive">{errors.targetCustomer.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyInsight">
                  What is the single insight that makes this company possible now? *
                </Label>
                <Input
                  id="keyInsight"
                  placeholder="One insight. One sentence. Max 20 words."
                  {...register("keyInsight")}
                />
                {errors.keyInsight && (
                  <p className="text-sm text-destructive">{errors.keyInsight.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Traction */}
          <Card>
            <CardHeader>
              <CardTitle>Traction & Metrics</CardTitle>
              <CardDescription>Share your progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Current Monthly Revenue (USD) *</Label>
                <Select onValueChange={(v) => setValue("currentRevenue", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select revenue range" />
                  </SelectTrigger>
                  <SelectContent>
                    {revenueRanges.map((rev) => (
                      <SelectItem key={rev} value={rev}>{rev}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.currentRevenue && (
                  <p className="text-sm text-destructive">{errors.currentRevenue.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tractionHighlights">
                  Key Traction Highlights (Customers, pilots, growth, partnerships)
                </Label>
                <Textarea
                  id="tractionHighlights"
                  placeholder="Max 150 words"
                  className="min-h-[100px]"
                  {...register("tractionHighlights")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Team */}
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <CardDescription>Tell us about your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Founding Structure *</Label>
                  <Select onValueChange={(v) => setValue("foundingStructure", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select structure" />
                    </SelectTrigger>
                    <SelectContent>
                      {foundingStructures.map((fs) => (
                        <SelectItem key={fs} value={fs}>{fs}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.foundingStructure && (
                    <p className="text-sm text-destructive">{errors.foundingStructure.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Full-Time Team Members *</Label>
                  <Input id="teamSize" type="number" min="1" {...register("teamSize")} />
                  {errors.teamSize && (
                    <p className="text-sm text-destructive">{errors.teamSize.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="teamRoles">Founding Team Roles *</Label>
                <Input
                  id="teamRoles"
                  placeholder="e.g. CEO (Product), CTO (Engineering), COO (Operations)"
                  {...register("teamRoles")}
                />
                {errors.teamRoles && (
                  <p className="text-sm text-destructive">{errors.teamRoles.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Funding */}
          <Card>
            <CardHeader>
              <CardTitle>Funding</CardTitle>
              <CardDescription>Your fundraising status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Are you currently raising capital? *</Label>
                  <Select onValueChange={(v) => setValue("isRaising", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="planning">Planning to soon</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.isRaising && (
                    <p className="text-sm text-destructive">{errors.isRaising.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>If yes, current round</Label>
                  <Select onValueChange={(v) => setValue("currentRound", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select round" />
                    </SelectTrigger>
                    <SelectContent>
                      {roundTypes.map((rt) => (
                        <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Raise Size (USD)</Label>
                  <Select onValueChange={(v) => setValue("targetRaise", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select range" />
                    </SelectTrigger>
                    <SelectContent>
                      {raiseRanges.map((rr) => (
                        <SelectItem key={rr} value={rr}>{rr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="existingInvestors">Existing Investors (if any)</Label>
                  <Input
                    id="existingInvestors"
                    placeholder="e.g. Y Combinator, 500 Startups"
                    {...register("existingInvestors")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>What are you primarily looking for at this stage?</Label>
                <div className="flex flex-wrap gap-2">
                  {lookingForOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={lookingFor.includes(option) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleLookingFor(option)}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nextGoals">
                  What do you want to achieve in the next 3–6 months?
                </Label>
                <Textarea
                  id="nextGoals"
                  placeholder="Concrete outcomes, not vision."
                  className="min-h-[80px]"
                  {...register("nextGoals")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Saudi Arabia */}
          <Card>
            <CardHeader>
              <CardTitle>Saudi Arabia Focus</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Are you operating in, or planning to operate in Saudi Arabia? *</Label>
                <Select onValueChange={(v) => setValue("saudiOperating", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes_operating">Yes, currently operating</SelectItem>
                    <SelectItem value="yes_planning">Yes, planning to</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="open">Open to it</SelectItem>
                  </SelectContent>
                </Select>
                {errors.saudiOperating && (
                  <p className="text-sm text-destructive">{errors.saudiOperating.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pitch Deck & Final */}
          <Card>
            <CardHeader>
              <CardTitle>Pitch Deck & Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Pitch Deck (PDF, max 10MB) *</Label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-muted-foreground/50 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{pitchDeck ? pitchDeck.name : "Choose file"}</span>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="anythingElse">Anything else we should know? (optional)</Label>
                <Textarea
                  id="anythingElse"
                  placeholder="Any additional context..."
                  className="min-h-[80px]"
                  {...register("anythingElse")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Application
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
