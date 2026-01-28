import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, deal, historicalDeals, userPatterns, contacts, targetName, userContacts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "score":
        systemPrompt = `You are an expert venture capital analyst trained on the investment philosophy of a Saudi-based pre-seed investor. You evaluate deals based on:

1. Vision 2030 Alignment (1-5): How well does this startup align with Saudi Arabia's economic transformation goals?
2. Founder Execution Score (1-5): Can this founder execute under constraint? Track record matters.
3. Founder Sales Ability (1-5): Can they sell the vision to customers, investors, and talent?
4. Iteration Speed (1-5): How fast do they ship and learn?
5. Exit Potential: Who buys this company in Saudi Arabia? At what multiple?

Key Principles (Ray Dalio adapted for Saudi VC):
- Invest where Saudi demand + government tailwinds + capital availability intersect
- True diversification is structural, not just more deals
- Balance risk of ruin, not ownership percentage
- Radical humility: assume you're wrong and list failure modes
- Think in probabilities, not conviction

Historical patterns from past deals will inform your scoring.`;

        userPrompt = `Evaluate this startup deal:

Company: ${deal.company_name}
Sector: ${deal.sector || 'Not specified'}
Valuation: $${deal.valuation_usd ? (deal.valuation_usd / 1000000).toFixed(1) + 'M' : 'Not specified'}
Equity Offered: ${deal.equity_offered || 'Not specified'}%
Founder: ${deal.founder_name || 'Not specified'}

${historicalDeals?.length > 0 ? `
Historical Deal Patterns (learn from these):
${historicalDeals.slice(0, 10).map((d: any) => `- ${d.company_name} (${d.sector}): Outcome=${d.outcome || 'pending'}, Score=${d.overall_score || 'N/A'}`).join('\n')}
` : ''}

${userPatterns?.length > 0 ? `
User's Identified Patterns:
${userPatterns.map((p: any) => `- ${p.pattern_name}: Positive signals: ${p.positive_signals?.join(', ')}. Negative signals: ${p.negative_signals?.join(', ')}`).join('\n')}
` : ''}

Provide a JSON response with:
{
  "overall_score": 0-100,
  "vision_2030_alignment": 1-5,
  "founder_execution_score": 1-5,
  "founder_sales_ability": 1-5,
  "iteration_speed": 1-5,
  "failure_modes": ["list 3 specific ways this could fail in Saudi"],
  "exit_potential": "who buys and at what multiple",
  "pattern_matches": ["patterns from historical deals this matches"],
  "recommendation": "PASS" | "EVALUATE FURTHER" | "STRONG INTEREST",
  "reasoning": "2-3 sentence summary"
}`;
        break;

      case "memo":
        systemPrompt = `You are a professional VC analyst writing investment memos. Your memos are concise, data-driven, and follow a structured format. They should be suitable for sharing with LPs, co-investors, or as internal documentation.`;

        userPrompt = `Generate a 1-page investment memo for:

Company: ${deal.company_name}
Sector: ${deal.sector || 'Not specified'}
Valuation: $${deal.valuation_usd ? (deal.valuation_usd / 1000000).toFixed(1) + 'M' : 'Not specified'}
Equity: ${deal.equity_offered || 'Not specified'}%
Founder: ${deal.founder_name || 'Not specified'}
AI Score: ${deal.ai_score || 'Not evaluated'}
Stage: ${deal.stage}

${deal.notes ? `Notes: ${deal.notes}` : ''}

Generate a professional memo with these sections:
1. **Executive Summary** (2-3 sentences)
2. **The Opportunity** (market size, timing, Vision 2030 alignment)
3. **The Team** (founder assessment)
4. **Business Model** (how they make money)
5. **Key Risks** (top 3 concerns)
6. **Investment Thesis** (why this could be a winner)
7. **Recommendation** (pass/proceed/conviction level)

Write in markdown format.`;
        break;

      case "backtest":
        systemPrompt = `You are a quantitative analyst running backtests on venture capital decisions. You analyze what would have happened if different investment decisions were made, based on market data and comparable exits.`;

        userPrompt = `Run a backtest simulation for this deal that was ${deal.outcome === 'pass' ? 'passed on' : 'invested in'}:

Company: ${deal.company_name}
Sector: ${deal.sector}
Entry Valuation: $${deal.valuation_usd ? (deal.valuation_usd / 1000000).toFixed(1) + 'M' : 'Unknown'}
Equity Position: ${deal.equity_offered || 2}%
Outcome Tagged: ${deal.outcome || 'pending'}
Date: ${deal.created_at}

Based on comparable companies in ${deal.sector} in the MENA region and typical pre-seed trajectories, simulate:

1. If this was a "win" - what's the likely exit valuation range?
2. If this was a "miss" - why did it fail?
3. What would the ROI have been at different scenarios (1x, 5x, 10x, 50x)?
4. Probability distribution of outcomes

Return JSON:
{
  "scenario_analysis": {
    "bear_case": { "exit_valuation": number, "roi": number, "probability": number },
    "base_case": { "exit_valuation": number, "roi": number, "probability": number },
    "bull_case": { "exit_valuation": number, "roi": number, "probability": number }
  },
  "expected_value": number,
  "lessons_learned": ["key insight 1", "key insight 2"],
  "filter_update": "what to look for or avoid based on this"
}`;
        break;

      case "chat":
        systemPrompt = `You are an AI investment advisor trained on the user's deal history and investment philosophy. You help evaluate deals using the user's own patterns and principles.

User's Investment Philosophy:
- Position Before Action: Only make moves that increase access, ownership, or leverage
- Ownership Over Income: Never trade time for money without equity upside
- Ray Dalio Principles adapted for Saudi pre-seed VC
- Focus on Vision 2030 aligned opportunities

${historicalDeals?.length > 0 ? `
The user has evaluated ${historicalDeals.length} deals historically. Key patterns:
- Wins: ${historicalDeals.filter((d: any) => d.outcome === 'win').length}
- Misses: ${historicalDeals.filter((d: any) => d.outcome === 'miss').length}
- Regrets: ${historicalDeals.filter((d: any) => d.outcome === 'regret').length}
- Average score of wins: ${Math.round(historicalDeals.filter((d: any) => d.outcome === 'win').reduce((sum: number, d: any) => sum + (d.overall_score || 0), 0) / Math.max(1, historicalDeals.filter((d: any) => d.outcome === 'win').length))}
` : 'No historical deals yet.'}

Answer as if you are the user's trusted investment advisor, using their own language and decision patterns.`;

        userPrompt = deal.message || "How should I think about this deal?";
        break;

      case "insight":
        systemPrompt = `You are a thought leadership content creator for a Saudi-based pre-seed investor. You help create compelling insights and content that:

1. Demonstrates deep expertise in the Saudi startup ecosystem
2. Aligns with Vision 2030 themes
3. Provides actionable value to founders, other investors, and ecosystem players
4. Builds the author's reputation as a trusted, thoughtful capital allocator

Writing style:
- Concise and punchy
- Data-driven when possible
- Contrarian takes welcome
- Avoid jargon and buzzwords
- Focus on lessons learned and pattern recognition`;

        userPrompt = `Generate a short-form insight (300-500 words) suitable for LinkedIn or a newsletter. Pick a topic from:
- Pre-seed investing lessons in MENA
- Founder evaluation frameworks
- Saudi startup ecosystem trends
- Vision 2030 investment opportunities
- Common founder mistakes and how to avoid them
- Building in emerging markets vs. established ones

Write the content ready to publish. Include a compelling hook in the first line.`;
        break;

      case "categorize-contacts":
        systemPrompt = `You are an expert at categorizing professional contacts for a venture capital investor. 
        
Categories:
- founder: Startup founders, CEOs, co-founders of companies
- capital_allocator: VCs, angel investors, fund managers, family office members, LPs
- advisor: Board members, advisors, mentors, consultants
- gatekeeper: Corporate executives, directors, managers who control access to deals or resources
- connector: Everyone else - professionals, friends, industry contacts

Analyze each contact's company and role to assign the most appropriate category.`;

        userPrompt = `Categorize these ${contacts?.length || 0} contacts into the categories above.

Contacts:
${contacts?.map((c: any, i: number) => `${i + 1}. ${c.name} - ${c.role || 'Unknown role'} at ${c.company || 'Unknown company'}`).join('\n')}

Return a JSON array of categories in the same order:
["founder", "capital_allocator", "connector", ...]

Only return the JSON array, nothing else.`;
        break;

      case "calculate-warmth":
        systemPrompt = `You are an expert at analyzing relationship strength based on interaction data. 
You calculate relationship warmth scores on a scale of 1-10 based on:
- Recency of last interaction (40% weight)
- Frequency of interactions (30% weight)  
- Quality/depth of interactions (30% weight)

Higher quality interactions: meetings, calls, introductions
Medium quality: emails, messages
Lower quality: social media likes, comments`;

        userPrompt = `Analyze this contact's relationship warmth:

Contact: ${deal?.name || 'Unknown'}
Last Touchpoint: ${deal?.last_touchpoint || 'Never'}
Total Touchpoints: ${deal?.touchpoint_count || 0}
Meeting Count: ${deal?.meeting_count || 0}
Tier: ${deal?.tier || 'Unknown'}

Calculate and return JSON:
{
  "warmth_score": 1-10,
  "recency_score": 1-10,
  "frequency_score": 1-10,
  "quality_score": 1-10,
  "reasoning": "brief explanation",
  "recommendation": "action to maintain or improve relationship"
}`;
        break;

      case "find-access-path":
        systemPrompt = `You are an expert at mapping relationship networks to find the best path to reach a target person.
You analyze existing contacts to find direct or indirect connections to a target founder or executive.
Prioritize:
1. Direct connections (you know them directly)
2. One-hop connections (a contact knows them)
3. Industry/sector connections (contacts in same field)
4. Warm introductions over cold outreach`;

        userPrompt = `Find the best access path to reach: ${targetName}

Your network (${userContacts?.length || 0} contacts):
${userContacts?.slice(0, 50).map((c: any) => `- ${c.name} (${c.tier}, ${c.organization || 'Unknown org'}) - Warmth: ${c.warmth_score || 5}/10`).join('\n') || 'No contacts available'}

Analyze and return JSON:
{
  "target": "${targetName}",
  "access_possible": true/false,
  "paths": [
    {
      "type": "direct" | "one_hop" | "industry" | "cold",
      "via_contact": "contact name if applicable",
      "confidence": 1-10,
      "strategy": "how to approach"
    }
  ],
  "best_approach": "recommended strategy",
  "contacts_to_leverage": ["list of contact names to involve"]
}`;
        break;

      case "check-resurface":
        systemPrompt = `You are an expert at comparing startup pitches over time to identify what has changed.
When a previously passed deal returns, you analyze:
1. What were the original objections
2. What has changed since then
3. Whether the changes address the original concerns
4. If it's worth reconsidering`;

        userPrompt = `A company you previously passed on is back:

Company: ${deal?.company_name || 'Unknown'}
Original Pass Date: ${deal?.pass_date || 'Unknown'}
Original Pass Reason: ${deal?.pass_reason || 'Not recorded'}
Original Objections: ${JSON.stringify(deal?.objections_at_pass || [])}
Original AI Score: ${deal?.original_ai_score || 'N/A'}

New Information:
${deal?.new_notes || 'No new information provided'}
New Valuation: ${deal?.new_valuation ? `$${(deal.new_valuation / 1000000).toFixed(1)}M` : 'Unknown'}

Analyze and return JSON:
{
  "worth_reconsidering": true/false,
  "original_concerns_addressed": ["list of concerns that have been addressed"],
  "remaining_concerns": ["list of concerns still valid"],
  "new_red_flags": ["any new concerns"],
  "key_question_to_ask": "the most important question to ask the founder",
  "recommendation": "RECONSIDER" | "STILL PASS" | "NEED MORE INFO",
  "reasoning": "2-3 sentence summary"
}`;
        break;

      case "analyze-velocity":
        systemPrompt = `You are an expert at analyzing deal pipeline velocity and identifying anomalies.
You look at how long deals spend in each stage and flag:
- Deals moving unusually fast (may need more diligence)
- Deals stuck too long (decision fatigue or lack of conviction)
- Patterns in stage transitions`;

        userPrompt = `Analyze deal velocity for this pipeline:

Deals with stage history:
${historicalDeals?.slice(0, 20).map((d: any) => `- ${d.company_name}: ${d.stage} (history: ${JSON.stringify(d.stage_history || [])})`).join('\n') || 'No deals with history'}

Calculate and return JSON:
{
  "average_days_per_stage": {
    "review": number,
    "evaluating": number,
    "term_sheet": number
  },
  "fast_movers": ["companies moving faster than average"],
  "stuck_deals": ["companies stuck longer than average"],
  "velocity_insights": ["key observations about pipeline movement"],
  "recommended_actions": ["what to do about stuck or fast-moving deals"]
}`;
        break;

      default:
        throw new Error("Unknown action");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Try to parse JSON responses
    let parsedContent = content;
    if (action === "score" || action === "backtest") {
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedContent = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        }
      } catch (e) {
        console.log("Could not parse JSON, returning raw content");
      }
    }

    // Parse contact categories
    if (action === "categorize-contacts") {
      try {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return new Response(JSON.stringify({ categories: JSON.parse(arrayMatch[0]) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.log("Could not parse categories, returning empty");
        return new Response(JSON.stringify({ categories: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ result: parsedContent, raw: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("deal-evaluator error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
