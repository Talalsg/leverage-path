import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use service role to bypass RLS for intake submissions
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Get the owner user - first user in profiles table (for single-user system)
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single();

    if (profileError || !profiles) {
      console.error('Could not find owner profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'System configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = profiles.id;

    // Map stage to deals stage format
    const stageMap: Record<string, string> = {
      'Idea / Concept': 'review',
      'Pre-Seed': 'review',
      'Seed': 'review',
      'Series A': 'review',
      'Series B': 'review',
      'Series C+': 'review',
    };

    // Build comprehensive notes from all form fields
    const notesContent = `
## Intake Submission
**Submitted:** ${new Date().toISOString()}

### One-Sentence Description
${body.oneSentence || 'N/A'}

### Company Description
${body.companyDescription || 'N/A'}

### Key Insight
${body.keyInsight || 'N/A'}

### Target Customer
${body.targetCustomer || 'N/A'}

### Traction Highlights
${body.tractionHighlights || 'N/A'}

### Team
- **Structure:** ${body.foundingStructure || 'N/A'}
- **Size:** ${body.teamSize || 'N/A'} full-time members
- **Roles:** ${body.teamRoles || 'N/A'}

### Funding
- **Currently Raising:** ${body.isRaising || 'N/A'}
- **Round:** ${body.currentRound || 'N/A'}
- **Target Raise:** ${body.targetRaise || 'N/A'}
- **Existing Investors:** ${body.existingInvestors || 'N/A'}
- **Looking For:** ${body.lookingFor?.join(', ') || 'N/A'}

### Goals (Next 3-6 Months)
${body.nextGoals || 'N/A'}

### Saudi Arabia
${body.saudiOperating || 'N/A'}

### Revenue
${body.currentRevenue || 'N/A'}

### Additional Notes
${body.anythingElse || 'N/A'}

### Company Details
- **Headquarters:** ${body.headquarters || 'N/A'}
- **Year Founded:** ${body.yearFounded || 'N/A'}
- **Company LinkedIn:** ${body.companyLinkedIn || 'N/A'}
- **Co-founder LinkedIn:** ${body.cofounderLinkedIn || 'N/A'}
    `.trim();

    // Create contact (founder) in ecosystem
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        name: body.fullName,
        organization: body.companyName,
        role: body.role,
        email: body.email,
        phone: body.phone || null,
        linkedin: body.founderLinkedIn,
        tier: 'founder',
        trust_level: 3,
        warmth_score: 5.0,
        notes: `Submitted via intake form on ${new Date().toLocaleDateString()}`,
        relationship_context: `Founder at ${body.companyName}. ${body.oneSentence}`,
      })
      .select()
      .single();

    if (contactError) {
      console.error('Error creating contact:', contactError);
    }

    // Create deal in deal flow
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        user_id: userId,
        company_name: body.companyName,
        sector: body.primaryIndustry,
        stage: stageMap[body.companyStage] || 'review',
        founder_name: body.fullName,
        founder_linkedin: body.founderLinkedIn,
        deck_url: body.pitchDeckUrl || null,
        notes: notesContent,
        // vision_2030_alignment expects 1-5 range
        vision_2030_alignment: body.saudiOperating?.includes('yes') ? 5 : 
                               body.saudiOperating === 'open' ? 3 : 1,
      })
      .select()
      .single();

    if (dealError) {
      console.error('Error creating deal:', dealError);
      return new Response(
        JSON.stringify({ error: 'Failed to create deal', details: dealError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log activity
    await supabase.from('activities').insert({
      user_id: userId,
      type: 'deal_created',
      title: `New intake: ${body.companyName}`,
      description: `${body.fullName} submitted ${body.companyName} via intake form`,
      entity_type: 'deal',
      entity_id: deal?.id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Startup intake submitted successfully',
        dealId: deal?.id,
        contactId: contact?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Intake submission error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
