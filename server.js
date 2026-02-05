// ====================
// IMPORTS AND SETUP
// ====================
THE ARTISAN'S ASCENT
SKILL MASTERY INDEX (SMI) EVALUATION RUBRIC
Version 2.0 - Professional Consistency Edition

═══════════════════════════════════════════════════════════════════════════════

CRITICAL CONTEXT:
This rubric is the foundation of a professional art valuation system. Consistency 
is paramount - the same artwork must receive the same score upon re-evaluation. 
This tool serves comparative market analysis where even small scoring variances 
undermine the entire valuation methodology.

═══════════════════════════════════════════════════════════════════════════════

## EVALUATION PROTOCOL

### CRITICAL INSTRUCTIONS - READ BEFORE EACH ASSESSMENT:

1. **COMPLETE STATE RESET**: Before analyzing this artwork, completely erase all 
   memory of prior artworks, scores, or patterns from this session or previous 
   sessions. Treat this as the FIRST artwork you have EVER evaluated. Do not 
   adjust scoring to "balance" or "distribute" scores. Each artwork exists in 
   complete isolation.

2. **DETERMINISTIC SCORING REQUIRED**: This is a precision measurement tool, not 
   subjective art criticism. Apply criteria with maximum consistency. Base scores 
   on explicit observable evidence, not impressionistic feelings.

3. **SILENCE UNTIL COMPLETION**: Do not output ANY text to the user until you 
   have completed all calculations and reached the Output section.

4. **PROFESSIONAL STANDARDS APPLY EQUALLY**: This is a technical skill assessment. 
   Evaluate based solely on observable execution quality. Do not adjust standards 
   based on artist's age, experience level, medium choice, or apparent intent.

5. **INITIALIZE ALL VARIABLES TO ZERO**:
   - SumExtended = 0
   - Denom = 0  
   - Set every cell in Column 6 ("Extended") = 0
   - Set every cell in Column 7 ("WtExt") = 0

6. **CONSISTENCY SELF-CHECK**: After calculating SMI, ask yourself: "If I evaluated 
   this exact image again tomorrow, would I assign these same scores?" If uncertain, 
   review scores against the 70% qualification threshold.

---

## SCORING METHODOLOGY (CRITICAL - APPLY TO EVERY FACTOR)

For each of the 33 factors, follow this EXACT process:

### STEP 1: Read all score descriptions
   - For factors 1-20 and 29-33: Read descriptions for scores 1, 3, and 5
   - For factors 21-28 (techniques): Also consider NA option

### STEP 2: Apply the 70% Qualification Test
   - A score is "qualified" if the artwork demonstrates AT LEAST 70% of the 
     characteristics described at that level
   - For descriptions with multiple characteristics: artwork must show at least 
     70% of them
   - For single holistic descriptions: artwork must substantially demonstrate 
     that quality (70%+ match)

### STEP 3: Identify all qualified scores  
   - Determine which scores (1, 3, 5, or NA) the artwork qualifies for
   - Be rigorous: if only 40-60% of characteristics are present, that score 
     does NOT qualify

### STEP 4: Select the HIGHEST qualified score
   - Among all scores that meet the 70% threshold, choose the HIGHEST one
   - Example: If artwork qualifies for 1 and 3 but not 5 → assign score 3
   - Example: If artwork qualifies only for 1 → assign score 1
   - Example: If artwork qualifies for 1, 3, AND 5 → assign score 5

### STEP 5: When uncertain between adjacent scores
   - If artwork CLEARLY meets 70%+ of lower score BUT only 40-60% of higher 
     score → choose LOWER score
   - Consistency requires conservative scoring when evidence is ambiguous
   - Better to be consistently conservative than variably generous

### STEP 6: Technique Factors (21-28) NA Guidance
   - Score NA ONLY if: technique is completely absent AND not applicable to the 
     artwork's medium or style
   - If technique is attempted but poorly executed → score 1 (NOT NA)
   - If technique could apply but artist chose not to use it → score 1 (NOT NA)
   - NA is rare - most techniques score 1, 3, or 5

---

## CALCULATION PROCESS

After scoring all 33 factors, calculate SMI using this exact formula:

For each row (factor 1-33):
   a. If Score = NA → Extended = 0, WtExt = 0
   b. If Score = 1, 3, or 5 → Extended = Score × Weight, WtExt = Weight

After all rows:
   c. SumExtended = sum of all Extended values (Column 6)
   d. Denom = sum of all WtExt values (Column 7)  
   e. SMI_calculated = SumExtended ÷ Denom
   f. SMI_final = Round SMI_calculated to nearest 0.1 (one decimal place)

**ROUNDING RULE:**
Round to nearest tenth using standard rounding (0.05 rounds up):
   - 3.34 → 3.3
   - 3.35 → 3.4
   - 3.36 → 3.4
   - 3.44 → 3.4
   - 3.45 → 3.5

---

## THE 33 FACTORS WITH 3-POINT SCORING RUBRIC

═══════════════════════════════════════════════════════════════════════════════
CATEGORY 1: CORE ELEMENTS (Factors 1-10)
Weight total: 0.311
═══════════════════════════════════════════════════════════════════════════════

### FACTOR 1: Line
**Weight: 0.037**

**Definition:** Marks with length and direction created by tools or implied by 
edges; can be continuous, broken, varied in weight/thickness, or textural. Lines 
define shapes, create movement patterns, guide viewer attention, suggest emotion 
through character (agitated vs. calm, decisive vs. tentative).

**Score 1 (Weak Execution):**
Lines show uncontrolled variation in weight without purpose; change direction 
arbitrarily; break where continuity was intended; fail to define intended forms 
or create coherent movement; appear hesitant, uncertain, or technically inadequate.

**Score 3 (Competent Execution):**
Lines demonstrate controlled weight and direction appropriate to subject; 
effectively define forms and create intentional textures; guide viewer's eye 
through composition with clear purpose; technical control is evident and supports 
the artwork's goals.

**Score 5 (Strong Execution):**
Lines exhibit sophisticated control with purposeful variation in weight, texture, 
and character; create compelling rhythm and movement integral to composition's 
success; demonstrate mastery of line quality as expressive tool; innovative or 
exceptionally skillful use elevates the entire work.

---

### FACTOR 2: Shape
**Weight: 0.037**

**Definition:** Two-dimensional areas defined by boundaries (edges, lines, or 
color/value changes); can be geometric (mathematical forms: circles, squares, 
triangles) or organic (irregular, natural forms). Shapes create visual structure, 
pattern, and compositional organization.

**Score 1 (Weak Execution):**
Shapes have unclear or poorly defined boundaries; awkward proportions that detract 
from intended forms; shapes appear unintentional or poorly controlled; fail to 
create effective compositional structure.

**Score 3 (Competent Execution):**
Shapes are clearly defined with appropriate proportions; boundaries are crisp or 
intentionally soft as needed; shapes integrate effectively into composition; 
balance of geometric and organic forms (where applicable) supports the work.

**Score 5 (Strong Execution):**
Shapes demonstrate sophisticated proportion and relationship; innovative use of 
positive/negative space; complex interplay between shapes creates strong visual 
interest; shape relationships are integral to composition's power.

---

### FACTOR 3: Form
**Weight: 0.031**

**Definition:** The illusion of three-dimensional volume in two-dimensional work, 
or actual three-dimensionality in sculpture. Created through modeling (light/shadow 
gradation), perspective, overlapping, and consistent light source direction. 
Conveys weight, mass, and sculptural presence.

**Score 1 (Weak Execution):**
Minimal indication of volume; objects appear flat despite apparent intent for 
dimensionality; inconsistent or absent light source; inadequate modeling of form 
through value; lacks believable three-dimensional presence.

**Score 3 (Competent Execution):**
Clear three-dimensional forms with consistent light direction; believable volume 
created through adequate shading and highlights; forms have appropriate weight 
and mass for their subject; technical modeling is competent throughout.

**Score 5 (Strong Execution):**
Exceptional sculptural quality with sophisticated light/shadow relationships; 
strong sense of volume, weight, and mass; refined modeling demonstrates deep 
understanding of form; dimensional illusion is convincing and masterfully executed.

---

### FACTOR 4: Space
**Weight: 0.037**

**Definition:** The illusion of depth and spatial relationships in two-dimensional 
work. Created through: overlapping forms, size gradation (larger=closer), 
atmospheric perspective (distant objects less distinct, cooler, lower contrast), 
linear perspective (vanishing points), and value/saturation changes with distance.

**Score 1 (Weak Execution):**
Minimal depth; spatial relationships are unclear, contradictory, or absent; 
elements appear disconnected or floating; no coherent sense of foreground/
background; depth cues are weak or conflicting.

**Score 3 (Competent Execution):**
Clear spatial organization using recognizable depth techniques (overlapping, size 
variation, atmospheric effects, or perspective); believable spatial relationships; 
coherent foreground/middleground/background organization where applicable.

**Score 5 (Strong Execution):**
Sophisticated spatial composition using multiple depth techniques effectively; 
compelling sense of immersive space; complex and convincing spatial relationships 
throughout; space itself becomes an expressive element of the composition.

---

### FACTOR 5: Color/Hue
**Weight: 0.037**

**Definition:** The identity of colors (red, blue, yellow, etc.) and their 
relationships. Includes understanding of color temperature (warm: reds, oranges, 
yellows vs. cool: blues, greens, purples), color harmony (complementary, analogous, 
triadic schemes), and color's symbolic/emotional associations.

**Score 1 (Weak Execution):**
Color choices appear random, discordant, or muddy; poor understanding of color 
relationships; hues work against each other creating visual confusion; color 
decisions undermine the work's intent.

**Score 3 (Competent Execution):**
Coherent color scheme with intentional hue relationships; appropriate use of warm/
cool contrasts; colors support the mood and subject; demonstrates functional 
understanding of color theory.

**Score 5 (Strong Execution):**
Sophisticated color orchestration with complex, harmonious relationships; 
innovative or particularly effective color choices; color becomes a primary 
expressive force; demonstrates advanced understanding of color interaction.

---

### FACTOR 6: Texture
**Weight: 0.025**

**Definition:** Surface quality - either actual (physical, tactile in three-
dimensional work or through paint application) or visual/implied (illusion of 
texture in two-dimensional work). Includes surface interest from brushwork, tool 
marks, material properties, or depiction of textural qualities (rough, smooth, 
soft, hard, etc.).

**Score 1 (Weak Execution):**
Texture appears unintentional or poorly controlled; inappropriate texture choices 
detract from work; inability to create desired surface quality; texture works 
against the artwork's goals.

**Score 3 (Competent Execution):**
Appropriate textural choices support the subject and medium; surface quality is 
intentional and controlled; effective contrast between different textural areas 
where applicable; texture enhances viewer interest.

**Score 5 (Strong Execution):**
Sophisticated use of texture as expressive element; rich, varied surface that 
invites close examination; masterful control of textural contrasts; texture is 
integral to the work's impact and meaning.

---

### FACTOR 7: Tone/Value
**Weight: 0.043**

**Definition:** The range from light to dark independent of color (the "grayscale" 
quality). Includes value structure (arrangement of lights and darks), value 
contrast (degree of difference), value patterns (grouping of similar values), and 
use of value to create form, depth, mood, and focal emphasis.

**Score 1 (Weak Execution):**
Narrow, inadequate value range; poor value structure creates confusion; values 
don't support form or depth effectively; muddy middle values without clear light/
dark organization; inadequate contrast.

**Score 3 (Competent Execution):**
Appropriate value range with clear light, middle, and dark values; effective value 
contrast creates form and depth; value structure supports composition and guides 
viewer's eye; technically competent value control.

**Score 5 (Strong Execution):**
Sophisticated value orchestration with compelling light/dark patterns; masterful 
control of value range and contrast; value structure is powerful compositional 
element; exceptional understanding of value's role in creating impact.

---

### FACTOR 8: Saturation
**Weight: 0.031**

**Definition:** The intensity or purity of color - ranging from pure, vivid hue 
(high saturation) to gray/neutral (low saturation/desaturated). Saturation affects 
mood (high saturation = energetic, low = subdued), depth (distant objects less 
saturated), and focal emphasis (saturated areas attract attention).

**Score 1 (Weak Execution):**
Inappropriate saturation choices undermine the work; all colors at same saturation 
level creating monotony or chaos; inability to control color intensity; saturation 
works against depth, mood, or focal goals.

**Score 3 (Competent Execution):**
Intentional saturation choices support mood and composition; effective use of 
saturation variation for emphasis and depth; demonstrates understanding of 
saturation's role; technically competent saturation control.

**Score 5 (Strong Execution):**
Sophisticated saturation orchestration creating powerful effects; masterful 
control of intensity variation; innovative or particularly effective saturation 
choices elevate the work; saturation is key expressive tool.

---

### FACTOR 9: Composition
**Weight: 0.043**

**Definition:** The overall arrangement and organization of all visual elements 
within the picture plane. Includes placement decisions, visual pathways, division 
of space, structural framework (rule of thirds, golden ratio, etc.), and the 
relationship between all parts creating a unified whole.

**Score 1 (Weak Execution):**
Poor spatial organization; elements appear randomly placed; no clear visual 
structure or hierarchy; composition fails to guide viewer effectively; parts don't 
relate coherently to create unified whole.

**Score 3 (Competent Execution):**
Clear compositional structure with intentional placement of elements; effective 
use of visual pathways and focal areas; good spatial division and organization; 
composition successfully unifies all parts into coherent whole.

**Score 5 (Strong Execution):**
Sophisticated compositional architecture with compelling visual structure; 
masterful control of element relationships and visual flow; innovative or 
exceptionally effective compositional choices; composition itself is a primary 
source of the work's power.

---

### FACTOR 10: Volume
**Weight: 0.025**

**Definition:** The perception of three-dimensional mass and weight. In two-
dimensional work: created through shading, highlights, cast shadows, reflected 
light, and consistent light source direction. Objects appear to have actual bulk, 
weight, and occupy convincing space.

**Score 1 (Weak Execution):**
Objects appear flat without volumetric presence; minimal sense of weight or mass; 
inconsistent or absent light source preventing volume perception; inadequate 
modeling of three-dimensional form.

**Score 3 (Competent Execution):**
Clear volumetric presence with appropriate sense of weight and mass; consistent 
light direction creates believable modeling; competent use of highlights and 
shadows to convey bulk; forms feel solid and three-dimensional.

**Score 5 (Strong Execution):**
Exceptional volumetric quality with powerful sense of weight, mass, and physical 
presence; sophisticated modeling with refined light/shadow/reflected light 
relationships; forms have compelling sculptural solidity.

═══════════════════════════════════════════════════════════════════════════════
CATEGORY 2: DESIGN PRINCIPLES (Factors 11-20)
Weight total: 0.348
═══════════════════════════════════════════════════════════════════════════════

### FACTOR 11: Balance
**Weight: 0.037**

**Definition:** Distribution of visual weight creating equilibrium. Types include: 
symmetrical (mirror image, formal), asymmetrical (informal, unequal elements 
balanced by size/color/position), and radial (elements arranged around central 
point). Balance affects viewer's sense of stability or tension.

**Score 1 (Weak Execution):**
Visual weight distribution creates unintended imbalance or awkward composition; 
heavy elements conflict with weak areas inappropriately; composition feels 
unstable without clear purpose; balance undermines the work.

**Score 3 (Competent Execution):**
Effective balance appropriate to the work's intent; visual weight is distributed 
to create intended stability or dynamic tension; balance type (symmetrical/
asymmetrical/radial) serves the composition well.

**Score 5 (Strong Execution):**
Sophisticated balance orchestration creating compelling visual equilibrium or 
purposeful tension; masterful weight distribution enhances composition; balance 
itself becomes expressive element integral to work's success.

---

### FACTOR 12: Contrast
**Weight: 0.043**

**Definition:** The degree of difference between elements: value contrast (light/
dark), color contrast (hue, temperature, saturation), textural contrast (rough/
smooth), size contrast (large/small), directional contrast (vertical/horizontal). 
Contrast creates visual interest, emphasis, and clarity.

**Score 1 (Weak Execution):**
Inadequate or excessive contrast creating confusion; all elements at similar 
contrast level producing monotony; contrast decisions undermine clarity or 
emphasis; poor understanding of contrast's purpose.

**Score 3 (Competent Execution):**
Effective use of contrast to create interest and emphasis; appropriate contrast 
levels for the subject and mood; good balance between areas of high and low 
contrast; contrast serves compositional goals.

**Score 5 (Strong Execution):**
Sophisticated contrast orchestration creating powerful visual impact; masterful 
control of multiple contrast types; innovative contrast choices elevate the work; 
contrast is primary tool for creating drama and focus.

---

### FACTOR 13: Emphasis/Focal Point
**Weight: 0.043**

**Definition:** The area(s) of greatest visual interest that capture and hold 
viewer attention. Created through contrast, isolation, placement, convergence of 
lines, unusual elements, or concentration of detail. Effective emphasis creates 
clear visual hierarchy.

**Score 1 (Weak Execution):**
No clear focal area; competing elements create confusion about where to look; 
emphasis is weak or absent; viewer's eye wanders without direction; poor visual 
hierarchy.

**Score 3 (Competent Execution):**
Clear focal area(s) effectively draw and hold attention; appropriate emphasis 
techniques create visual hierarchy; viewer's eye is guided purposefully; emphasis 
supports the work's intent and meaning.

**Score 5 (Strong Execution):**
Compelling focal orchestration with sophisticated visual hierarchy; masterful 
control of attention through multiple emphasis techniques; focal strategy is 
innovative or exceptionally effective; emphasis is integral to work's power.

---

### FACTOR 14: Movement
**Weight: 0.037**

**Definition:** The path the viewer's eye travels through the artwork. Created 
through: line direction, edge quality, value patterns, color progression, 
directional shapes, or rhythmic elements. Effective movement guides viewer through 
composition and prevents static, boring viewing experience.

**Score 1 (Weak Execution):**
Eye movement is confused, stagnant, or exits composition; no clear visual pathway; 
viewer attention gets trapped or lost; movement patterns work against effective 
viewing experience.

**Score 3 (Competent Execution):**
Clear visual pathways guide eye through composition effectively; intentional 
movement patterns keep viewer engaged; eye naturally circulates through important 
areas; movement supports compositional goals.

**Score 5 (Strong Execution):**
Sophisticated movement orchestration with compelling visual flow; masterful 
control of viewer's eye path creating dynamic viewing experience; innovative 
movement patterns elevate engagement; movement is integral to work's impact.

---

### FACTOR 15: Rhythm
**Weight: 0.037**

**Definition:** Regular or irregular repetition of visual elements creating sense 
of organized movement or visual tempo. Types: regular (consistent intervals), 
flowing (undulating, organic), progressive (gradual change), alternating (ABAB 
pattern). Rhythm creates unity and visual interest through predictable or varied 
repetition.

**Score 1 (Weak Execution):**
No discernible rhythm or confusing, inappropriate repetition; repetitive elements 
create monotony without purpose; rhythm works against visual interest; lack of 
rhythmic organization undermines composition.

**Score 3 (Competent Execution):**
Effective rhythmic patterns through intentional repetition; appropriate rhythm 
type for subject and mood; rhythm creates visual interest and unity; demonstrates 
understanding of repetition's organizing power.

**Score 5 (Strong Execution):**
Sophisticated rhythmic orchestration with compelling patterns; masterful use of 
regular and irregular repetition; innovative rhythmic choices create powerful 
visual tempo; rhythm is primary organizational and expressive tool.

---

### FACTOR 16: Variety
**Weight: 0.037**

**Definition:** The use of different or contrasting elements to prevent monotony 
and create visual interest. Includes variation in: size, shape, color, texture, 
value, direction, density. Variety must balance with unity - too little creates 
boredom, too much creates chaos.

**Score 1 (Weak Execution):**
Insufficient variety creating monotony, OR excessive variety creating chaos; poor 
balance between unity and variation; variety choices appear random or undermine 
cohesion; fails to sustain visual interest.

**Score 3 (Competent Execution):**
Effective variety balanced with unity; appropriate range of different elements 
sustain interest without creating confusion; variety choices support engagement 
while maintaining cohesion.

**Score 5 (Strong Execution):**
Sophisticated variety orchestration creating rich visual experience; masterful 
balance between diversity and unity; innovative variety choices elevate interest 
while maintaining strong cohesion; variety is key to work's vitality.

---

### FACTOR 17: Proportion
**Weight: 0.037**

**Definition:** The size relationship between parts of the artwork and between 
parts and the whole. Includes: scale relationships, mathematical ratios (golden 
ratio, root rectangles), human figure proportions (if applicable), and relative 
sizing that creates hierarchy or emphasis.

**Score 1 (Weak Execution):**
Awkward or incorrect proportional relationships; size relationships appear 
arbitrary or wrong; proportions undermine believability or visual harmony; poor 
understanding of appropriate scale relationships.

**Score 3 (Competent Execution):**
Appropriate proportional relationships throughout; good size harmony between 
elements; proportions support believability and visual organization; demonstrates 
competent understanding of scale relationships.

**Score 5 (Strong Execution):**
Sophisticated proportional orchestration with compelling size relationships; 
masterful use of scale for emphasis and harmony; innovative or exceptionally 
effective proportional choices; proportion itself is expressive tool.

---

### FACTOR 18: Harmony
**Weight: 0.037**

**Definition:** The pleasing, balanced arrangement of elements where parts relate 
well without conflict. Elements "belong together" through similarity in: color 
relationships, repeated shapes, consistent style, unified mood. Harmony creates 
visual peace and coherence without blandness.

**Score 1 (Weak Execution):**
Elements conflict or fail to relate; discordant relationships create visual 
tension without purpose; parts don't "belong together"; lack of unifying 
characteristics; harmony is absent or undermines work.

**Score 3 (Competent Execution):**
Elements relate harmoniously with appropriate similarities; consistent style and 
mood throughout; balanced relationships create visual coherence; demonstrates 
understanding of unifying principles.

**Score 5 (Strong Execution):**
Sophisticated harmonic relationships create powerful coherence; masterful 
orchestration of similarities and connections; exceptional unity that elevates 
the whole; harmony is integral to work's aesthetic success.

---

### FACTOR 19: Cohesiveness/Unity
**Weight: 0.043**

**Definition:** The wholeness where all parts work together as integrated system 
supporting overall theme or concept. Nothing feels extraneous; if any element were 
removed, the work would be diminished. Created through consistent style, repeated 
elements, harmonious relationships, and purposeful organization.

**Score 1 (Weak Execution):**
Parts feel disconnected or arbitrary; elements don't support unified whole; work 
feels fragmented or contains extraneous parts; lack of integration undermines 
impact; no clear sense of purposeful totality.

**Score 3 (Competent Execution):**
All parts contribute to coherent whole; effective integration where elements 
support each other; nothing feels random or extraneous; work has sense of 
completeness and purposeful organization.

**Score 5 (Strong Execution):**
Exceptional unity where every element is essential and perfectly integrated; 
masterful orchestration of all parts into powerful whole; removing anything would 
significantly diminish work; unity is source of work's power.

---

### FACTOR 20: Pattern
**Weight: 0.037**

**Definition:** Predictable repetition of elements throughout the work creating 
visual rhythm and decorative interest. Can be regular (geometric, consistent) or 
irregular (organic, varied). Pattern creates texture, fills space, unifies areas, 
and can be structural or decorative element.

**Score 1 (Weak Execution):**
Pattern is weak, confusing, or undermines composition; repetitive elements create 
monotony without purpose; pattern execution is inconsistent or poorly controlled; 
pattern decisions detract from work.

**Score 3 (Competent Execution):**
Effective pattern through consistent repetition; appropriate pattern type for 
subject and medium; pattern creates visual interest and organizational structure; 
demonstrates competent control of repetitive elements.

**Score 5 (Strong Execution):**
Sophisticated pattern orchestration with compelling repetitive structure; 
masterful control creating rich visual texture; innovative or exceptionally 
effective pattern choices; pattern is integral to work's visual impact.

═══════════════════════════════════════════════════════════════════════════════
CATEGORY 3: TECHNIQUES (Factors 21-28)
Weight total: 0.148
═══════════════════════════════════════════════════════════════════════════════

**TECHNIQUE SCORING NOTE:** These factors assess specific painting/drawing 
techniques. Score NA only if the technique is completely absent AND not applicable 
to the medium/style. If attempted but weak, score 1. Most techniques score 1, 3, 
or 5.

---

### FACTOR 21: Brushwork/Mark-Making
**Weight: 0.025**

**Definition:** The visible quality of tool application - how paint, pencil, 
charcoal, pastel, or other media are applied. Includes: stroke direction and 
energy, mark variety and texture, technical control, expressive character. 
Brushwork can be invisible (smooth), or visible and expressive.

**Score NA:** Not applicable to medium (e.g., digital work with no brush 
simulation, photography, smooth airbrush technique).

**Score 1 (Weak Execution):**
Brushwork/marks appear clumsy, uncertain, or technically inadequate; tool handling 
lacks control; marks undermine rather than enhance the work; execution appears 
amateurish or unintentional.

**Score 3 (Competent Execution):**
Confident, controlled tool handling appropriate to subject and style; marks are 
intentional and support the work; brushwork demonstrates technical competence; 
consistent mark quality throughout.

**Score 5 (Strong Execution):**
Masterful tool handling with sophisticated mark variety and energy; brushwork is 
expressive element integral to work's power; exceptional technical control allows 
innovative or particularly effective mark-making.

---

### FACTOR 22: Chiaroscuro
**Weight: 0.018**

**Definition:** Dramatic use of strong light/dark contrasts to create volume and 
focus. Characterized by: bold value contrasts, dramatic lighting effects, strong 
shadows defining form, spotlight or theatrical lighting quality. Differs from 
general value structure by emphasizing dramatic contrast.

**Score NA:** Not used and not applicable to the work's style or intent (e.g., 
high-key work, flat decorative style, work emphasizing color over value).

**Score 1 (Weak Execution):**
Attempted dramatic lighting falls flat; poor control of light/dark contrasts 
undermines drama; shadows and highlights don't effectively model form; chiaroscuro 
technique is weak or confusing.

**Score 3 (Competent Execution):**
Effective dramatic light/dark contrasts create form and focus; strong shadows and 
highlights model volume; chiaroscuro technique successfully creates intended 
dramatic effect.

**Score 5 (Strong Execution):**
Masterful chiaroscuro with powerful dramatic lighting; sophisticated control of 
light/dark contrasts creates exceptional volume and atmosphere; technique is 
integral to work's emotional and visual impact.

---

### FACTOR 23: Impasto
**Weight: 0.018**

**Definition:** Thick application of paint creating actual three-dimensional 
texture where brush or knife marks are visibly raised from surface. Creates 
tactile quality, light-catching ridges, expressive surface energy. Requires 
sufficient paint thickness to cast shadows on its own surface.

**Score NA:** Not used and not applicable (e.g., watercolor, thin oil washes, 
drawing media, smooth application style).

**Score 1 (Weak Execution):**
Clumsy or excessive impasto undermines work; thick paint appears uncontrolled or 
arbitrary; texture detracts rather than enhances; poor understanding of technique's 
potential.

**Score 3 (Competent Execution):**
Effective use of impasto creates interesting surface and light effects; paint 
thickness is controlled and purposeful; technique enhances visual interest and 
texture appropriately.

**Score 5 (Strong Execution):**
Masterful impasto with sophisticated thick paint manipulation; exceptional surface 
quality integral to work's power; innovative or particularly effective use of 
dimensional paint creates compelling tactile presence.

---

### FACTOR 24: Sfumato
**Weight: 0.018**

**Definition:** Extremely subtle, gradual blending of colors and tones creating 
soft, imperceptible transitions without hard edges. Creates atmospheric, dreamlike, 
or soft-focus quality. Characterized by "smoky" effect where transitions are so 
gradual they seem to evaporate into one another.

**Score NA:** Not used and not applicable (e.g., hard-edge work, high-contrast 
style, alla prima technique, linear style).

**Score 1 (Weak Execution):**
Attempted soft blending creates muddy or unclear results; transitions are clumsy 
rather than subtle; technique fails to create intended atmospheric effect; poor 
control undermines quality.

**Score 3 (Competent Execution):**
Effective soft blending creates smooth, atmospheric transitions; edges are 
appropriately softened; technique successfully creates intended ethereal or 
subtle-focus quality.

**Score 5 (Strong Execution):**
Exceptional sfumato with imperceptible, masterful blending; sophisticated control 
creates ethereal, luminous quality; technique is integral to work's atmospheric 
power and beauty.

---

### FACTOR 25: Glazing
**Weight: 0.025**

**Definition:** Application of transparent or translucent color layers over dried 
underlayers, allowing underlayers to show through and optically mix. Creates: 
depth, luminosity, rich color that can't be achieved by direct mixing. Each layer 
modifies but doesn't obscure layers beneath.

**Score NA:** Not used and not applicable (e.g., opaque alla prima technique, 
direct painting, drawing media, watercolor used opaquely).

**Score 1 (Weak Execution):**
Attempted glazing creates muddy, streaky, or opaque results; poor control of 
transparency undermines technique; glazes obscure rather than enhance underlayers; 
lacks understanding of optical mixing potential.

**Score 3 (Competent Execution):**
Effective transparent layering creates depth and luminosity; glazes successfully 
modify underlayers while maintaining transparency; technique demonstrates 
understanding of optical color mixing.

**Score 5 (Strong Execution):**
Masterful glazing with sophisticated transparent layering; exceptional depth and 
glowing, luminous color quality; complex layering creates effects impossible 
through direct mixing; technique is integral to work's richness.

---

### FACTOR 26: Scumbling
**Weight: 0.018**

**Definition:** Dry-brush application of thin, broken, semi-opaque color over dry 
underlayer, allowing underlayer to show through irregularly. Creates: textured 
surface effects, visual vibration between layers, atmospheric effects. Paint is 
dragged or scrubbed lightly so it catches on surface texture.

**Score NA:** Not used and not applicable (e.g., smooth wet-in-wet work, drawing 
media, watercolor, uniform opaque painting).

**Score 1 (Weak Execution):**
Clumsy scumbling detracts from surface quality; broken color application appears 
uncontrolled or arbitrary; technique fails to create intended textural or 
atmospheric effects; poor execution undermines work.

**Score 3 (Competent Execution):**
Effective scumbling creates interesting broken color and surface texture; 
controlled dry-brush application allows appropriate underlayer visibility; 
technique successfully enhances surface quality.

**Score 5 (Strong Execution):**
Masterful scumbling with sophisticated broken color layering; exceptional control 
creates rich, complex surface texture; technique significantly enriches visual and 
tactile quality; integral to work's surface beauty.

---

### FACTOR 27: Pointillism/Divisionism
**Weight: 0.018**

**Definition:** Building images from distinct dots or small marks of pure color 
placed in close proximity, relying on optical mixing in viewer's eye rather than 
physical color mixing. Creates: vibrant color effects, shimmering quality, 
distinctive textural surface. Requires systematic, controlled application.

**Score NA:** Not used and not applicable (most works will score NA for this 
specialized technique).

**Score 1 (Weak Execution):**
Uncontrolled dots or marks fail to create intended optical mixing or image 
coherence; technique appears arbitrary or poorly executed; pointillist approach 
undermines rather than enhances work.

**Score 3 (Competent Execution):**
Effective systematic dot or mark application creates optical color mixing; 
controlled placement builds coherent image; technique successfully creates 
intended vibrant, textured quality.

**Score 5 (Strong Execution):**
Masterful pointillism with sophisticated optical color relationships; exceptional 
control creates vibrant, luminous effects; technique is integral to work's unique 
visual impact and demonstrates deep understanding.

---

### FACTOR 28: Wet-on-Wet/Alla Prima
**Weight: 0.025**

**Definition:** Applying wet paint onto still-wet underlayers, allowing colors to 
blend and merge on the surface. Creates: soft transitions, fluid color mixing, 
fresh spontaneous quality, painterly rather than precise edges. Requires confident 
brushwork as corrections are difficult.

**Score NA:** Not used and not applicable (e.g., layered technique with full 
drying between layers, drawing media, carefully built-up glazing technique).

**Score 1 (Weak Execution):**
Wet blending creates muddy, overworked, or uncontrolled results; poor color mixing 
on surface undermines clarity; technique appears clumsy rather than fresh; lack of 
control damages work quality.

**Score 3 (Competent Execution):**
Effective wet-into-wet blending creates smooth gradations and fresh color; 
controlled surface mixing maintains color clarity; technique successfully creates 
intended fluid, spontaneous quality.

**Score 5 (Strong Execution):**
Masterful wet-on-wet technique with sophisticated, confident brushwork; exceptional 
control allows fluid, expressive results while maintaining color purity; technique 
is integral to work's vitality and painterly beauty.

═══════════════════════════════════════════════════════════════════════════════
CATEGORY 4: ARTISTIC VOICE (Factors 29-33)
Weight total: 0.193
═══════════════════════════════════════════════════════════════════════════════

### FACTOR 29: Uniqueness/Originality
**Weight: 0.043**

**Definition:** The degree to which the work exhibits distinctive personal voice 
and departs from purely conventional or derivative approaches. Recognizable 
personal style, fresh perspective, innovative solutions to visual problems. Not 
mere novelty but authentic individual expression.

**Score 1 (Weak Execution):**
Work is heavily derivative, copying known styles without personal input; appears 
as exercise in imitation; minimal evidence of individual artistic voice; purely 
conventional approach without fresh perspective.

**Score 3 (Competent Execution):**
Clear emergence of personal style with distinctive characteristics; work shows 
individual interpretation while building on established traditions; demonstrates 
developing unique artistic voice.

**Score 5 (Strong Execution):**
Strong, unmistakable individual voice with innovative personal approach; work is 
distinctly recognizable as this artist's vision; demonstrates authentic originality 
that establishes new territory or fresh perspective.

---

### FACTOR 30: Creativity/Innovation
**Weight: 0.049**

**Definition:** Evidence of creative problem-solving, innovative thinking, and 
imaginative approach to concept, composition, or technique. Going beyond 
conventional solutions to find fresh, inventive ways to achieve artistic goals. 
Creative synthesis of influences into something new.

**Score 1 (Weak Execution):**
Conventional, predictable solutions showing minimal creative problem-solving; 
formulaic approach without imaginative thinking; appears to follow safe, well-worn 
paths without risk or innovation.

**Score 3 (Competent Execution):**
Clear creative thinking evident in concept or execution; demonstrates imaginative 
approaches to visual problems; successful synthesis of influences into personal 
solutions; good creative problem-solving.

**Score 5 (Strong Execution):**
Exceptional creativity with innovative solutions that transform conventional 
approaches; sophisticated imaginative thinking produces fresh, compelling results; 
creative vision is integral to work's power and interest.

---

### FACTOR 31: Mood/Atmosphere
**Weight: 0.043**

**Definition:** The emotional atmosphere or psychological climate the work creates 
- the feeling it evokes in the viewer. Achieved through: color choices, value 
patterns, mark quality, subject treatment, compositional decisions. Can be serene, 
energetic, melancholic, joyful, mysterious, tense, peaceful, etc.

**Score 1 (Weak Execution):**
Weak, unclear, or confused emotional atmosphere; mood fails to engage viewer; 
emotional intent (if any) doesn't successfully manifest; atmosphere is 
unconvincing or absent.

**Score 3 (Competent Execution):**
Clear, purposeful emotional atmosphere effectively established; mood enhances 
viewer experience and supports work's intent; atmosphere is convincing and 
appropriate to subject.

**Score 5 (Strong Execution):**
Powerful, immersive mood creation with sophisticated atmospheric control; 
exceptional emotional climate leaves lasting impression; atmosphere is integral to 
work's impact and meaning.

---

### FACTOR 32: Viewer Engagement
**Weight: 0.037**

**Definition:** The work's ability to capture and hold viewer attention, inviting 
sustained looking and discovery. Created through: visual complexity appropriate to 
scale, intriguing subject or treatment, skillful execution inviting close 
examination, compositional interest, emotional resonance. Work rewards extended 
viewing.

**Score 1 (Weak Execution):**
Minimal visual interest; work fails to capture or hold attention beyond brief 
glance; nothing invites sustained looking or closer examination; quickly boring or 
forgettable.

**Score 3 (Competent Execution):**
Good visual engagement that invites exploration; work holds attention 
appropriately; sustains interest through visual or conceptual richness; rewards 
looking with discovered details or relationships.

**Score 5 (Strong Execution):**
Exceptional engagement drawing viewer into extended, rewarding viewing; work 
compels attention and reveals new aspects with sustained looking; creates 
memorable, transformative viewing experience.

---

### FACTOR 33: Emotional Resonance
**Weight: 0.043**

**Definition:** The depth of emotional connection the work creates with viewers - 
how powerfully it resonates with human experience, memory, or feeling. Ability to 
evoke genuine emotional response that connects to viewer's own experiences. Creates 
empathy, recognition, or profound feeling.

**Score 1 (Weak Execution):**
Weak or absent emotional connection; work fails to resonate with viewer's 
experiences or feelings; emotional impact is shallow or quickly forgotten; doesn't 
create meaningful human connection.

**Score 3 (Competent Execution):**
Clear emotional impact that connects with viewer experience; work creates 
authentic feeling response; resonates with recognizable human emotions or 
situations; establishes meaningful connection.

**Score 5 (Strong Execution):**
Exceptional emotional power that profoundly resonates with viewer; creates lasting 
emotional impact and strong human connection; work touches deep feelings and may 
transform viewer's perspective or understanding.

═══════════════════════════════════════════════════════════════════════════════

## OUTPUT REQUIREMENTS

After completing all calculations, return your response as a valid JSON object 
with this EXACT structure:

{
  "smi": 3.4,
  "category_summaries": {
    "core_elements": "One factual sentence summarizing observable strengths or weaknesses in Factors 1-10 (Line through Volume)",
    "design_principles": "One factual sentence summarizing observable strengths or weaknesses in Factors 11-20 (Balance through Pattern)",
    "techniques": "One factual sentence noting which techniques (21-28) were used and their execution quality",
    "artistic_voice": "One factual sentence summarizing observable qualities in Factors 29-33 (Uniqueness through Emotional Resonance)"
  },
  "brief_description": "Two to three factual sentences describing observable aspects: subject matter, compositional structure, color palette, spatial organization, and overall visual character."
}

**CRITICAL OUTPUT REQUIREMENTS:**
- SMI must be rounded to EXACTLY 1 decimal place (nearest 0.1)
- Each category summary must be EXACTLY ONE sentence
- Brief description must be 2-3 sentences, NO MORE
- All text must be factual and observational, NOT evaluative
- Do NOT suggest improvements or identify weaknesses explicitly
- Do NOT use phrases like "demonstrates skill" or "shows weakness" - describe what IS
- Return ONLY the JSON object - no additional text, no markdown formatting, no preamble

**ROUNDING EXAMPLES FOR SMI:**
- Calculated 3.34 → Report 3.3
- Calculated 3.35 → Report 3.4
- Calculated 3.44 → Report 3.4
- Calculated 3.45 → Report 3.5
- Calculated 4.89 → Report 4.9
- Calculated 4.94 → Report 4.9
- Calculated 4.95 → Report 5.0

═══════════════════════════════════════════════════════════════════════════════
END OF RUBRIC
═══════════════════════════════════════════════════════════════════════════════

**FINAL REMINDER BEFORE EACH USE:**
This rubric determines the financial future of artists and the integrity of a 
professional valuation system. Apply it with maximum consistency, professional 
rigor, and adherence to the 70% qualification methodology. Every artwork deserves 
the same careful, unbiased evaluation - this is not subjective criticism but 
technical measurement of observable skill execution.

**PRECISION NOTE:**
SMI scores are reported to one decimal place (0.1 precision) to honestly reflect 
measurement reliability. Due to the interpretive nature of art evaluation, 
rescoring the same artwork may result in scores that vary by ±0.2 points. This 
variance is normal and scores within 0.3 points should be considered equivalent.
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const app = express();
const mime = require("mime-types");
const sharp = require("sharp");
const archiver = require("archiver");
const unzipper = require("unzipper");

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const allowedOrigins = [
  "https://robert-clark-4dee.mykajabi.com",
  "https://valora-analytics-api.onrender.com",
  "https://advisory.valoraanalytics.com",
  "https://stunning-arithmetic-16de6b.netlify.app"
];

// Global CORS middleware for all routes
app.use(
  cors({
    origin: [
      "https://robert-clark-4dee.mykajabi.com",
      "https://valora-analytics-api.onrender.com",
      "https://advisory.valoraanalytics.com",
      "https://stunning-arithmetic-16de6b.netlify.app",
      /\.netlify\.app$/
    ],
    credentials: true,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "Cache-Control", "Pragma"]
  })
);



const OPENAI_API_KEY = process.env.OPENAI_API_KEY;





// Global default temperature (you can change this number)
const DEFAULT_TEMPERATURE = 0.0;

// ====================
// MODEL CONFIGURATION
// ====================

const VALID_OPENAI_MODELS = ["gpt-4o", "gpt-4.1", "gpt-4.1-mini"];
const MODEL_CONFIG_PATH = '/mnt/data/model_config.json';

function readModelConfig() {
  try {
    if (!fs.existsSync(MODEL_CONFIG_PATH)) {
      return null;  // No model configured yet
    }
    const data = fs.readFileSync(MODEL_CONFIG_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading model config:", error);
    return null;
  }
}

function writeModelConfig(model) {
  try {
    const config = {
      activeModel: model,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(MODEL_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`✅ Model config updated: ${model}`);
    return true;
  } catch (error) {
    console.error('Error writing model config:', error.message);
    return false;
  }
}

// ====================
// UTILITY FUNCTIONS
// ====================



// Helper function to extract category scores from analysis text with improved regex patterns
function extractCategoryScores(analysisText) {
  console.log("Extracting category scores from analysis text...");

  // More robust regex patterns that look for category names followed by scores
  const categoryScoreRegex = {
    composition: /(?:1\.\s*)?(?:Composition\s*&\s*Design|Composition[\s:]+)[\s:]*(\d+\.?\d*)/i,
    color: /(?:2\.\s*)?(?:Color\s+Harmony\s*&\s+Use\s+of\s+Light|Color(?:\s+&\s+Light)?[\s:]+)[\s:]*(\d+\.?\d*)/i,
    technical: /(?:3\.\s*)?(?:Technical\s+Skill\s*&\s*Craftsmanship|Technical[\s:]+)[\s:]*(\d+\.?\d*)/i,
    originality: /(?:4\.\s*)?(?:Originality\s*&\s*Innovation|Originality[\s:]+)[\s:]*(\d+\.?\d*)/i,
    emotional: /(?:5\.\s*)?(?:Emotional\s*&\s*Conceptual\s+Depth|Emotional[\s:]+)[\s:]*(\d+\.?\d*)/i
  };

  // Try to find a section that might contain all scores
  let scoreSection = analysisText;

  // Look for sections that might contain all the category scores
  const categorySection = analysisText.match(
    /(?:Category|Criteria)\s+Scores[\s\S]*?(?=\n\n|$)/i
  );
  if (categorySection) {
    scoreSection = categorySection[0];
    console.log("Found dedicated category scores section");
  }

  const scores = {};

  // Extract each category score and log detailed info for debugging
  for (const [category, regex] of Object.entries(categoryScoreRegex)) {
    const match = scoreSection.match(regex);
    console.log(`Looking for ${category} score with regex: ${regex}`);

    if (match && match[1]) {
      const scoreValue = parseFloat(match[1]);
      scores[category] = scoreValue;
      console.log(`Found ${category} score: ${scoreValue}`);
    } else {
      // Check the whole text if not found in the score section
      const fullMatch = analysisText.match(regex);
      if (fullMatch && fullMatch[1]) {
        const scoreValue = parseFloat(fullMatch[1]);
        scores[category] = scoreValue;
        console.log(`Found ${category} score in full text: ${scoreValue}`);
      } else {
        // Don't set a default - we'll detect missing values and abort
        console.log(`Could not find ${category} score`);
      }
    }
  }

  // Also try to find scores in a different format
  // Look for all numbers in the format "Score: X.X" or "X.X/5.0"
  const allScores = scoreSection.match(
    /(?:Score|Rating):\s*(\d+\.?\d*)|(\d+\.?\d*)\/5\.0/g
  );
  if (allScores && allScores.length >= 5) {
    console.log("Found alternative score format:", allScores);
    // If we have enough scores in this format, use them instead
    const categories = [
      "composition",
      "color",
      "technical",
      "originality",
      "emotional"
    ];
    allScores.slice(0, 5).forEach((scoreText, index) => {
      const scoreMatch = scoreText.match(/(\d+\.?\d*)/);
      if (scoreMatch && scoreMatch[1] && categories[index]) {
        scores[categories[index]] = parseFloat(scoreMatch[1]);
        console.log(
          `Set ${categories[index]} score to ${scores[categories[index]]} from alternative format`
        );
      }
    });
  }

  // Check if we have all required scores
  const missingCategories = [];
  for (const category of [
    "composition",
    "color",
    "technical",
    "originality",
    "emotional"
  ]) {
    if (
      !scores[category] ||
      isNaN(scores[category]) ||
      scores[category] < 1.0 ||
      scores[category] > 5.0
    ) {
      missingCategories.push(category);
    }
  }

  if (missingCategories.length > 0) {
    console.log(
      `Missing or invalid scores for categories: ${missingCategories.join(", ")}`
    );
    return null; // Return null to indicate missing scores
  }

  console.log("Final extracted category scores:", scores);
  return scores;
}

// Function to round the SMI score up to the nearest 0.25 increment
function roundSMIUp(value) {
  // Calculate how many 0.25 increments in the value
  const increments = Math.ceil(value * 4) / 4;
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(increments * 100) / 100;
}



// ====================
// AI CALLER FUNCTION
// ====================

async function callAI(
  messages,
  maxTokens = 1000,
  systemContent = "",
  useJSON = false,
  temperature = DEFAULT_TEMPERATURE
) {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key not found");
  }

  // Read the active model from persistent config
  const modelConfig = readModelConfig();
  
  if (!modelConfig || !modelConfig.activeModel) {
    throw new Error("NO_MODEL_CONFIGURED: Admin must select an OpenAI model in Admin Menu before any apps can function");
  }
  
  const activeModel = modelConfig.activeModel;

  // Add system message if provided
  const finalMessages = systemContent
    ? [{ role: "system", content: systemContent }, ...messages]
    : messages;

  const requestBody = {
    model: activeModel,
    messages: finalMessages,
    max_tokens: maxTokens,
    temperature
  };

  if (useJSON) {
    requestBody.response_format = { type: "json_object" };
  }

  let response;
  try {
    response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
  } catch (error) {
    console.error("OpenAI API Error Details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      errorData: error.response?.data,
      requestedModel: activeModel,
      messageCount: finalMessages.length,
      hasImages: JSON.stringify(requestBody).includes('image_url')
    });
    throw error;
  }

  const responseText = response.data.choices[0]?.message?.content || "";

  // Handle JSON responses
  if (useJSON) {
    try {
      return JSON.parse(responseText);
    } catch (parseError) {
      throw new Error(`OpenAI returned invalid JSON: ${responseText}`);
    }
  }

  return responseText;
}





// ====================
// TEMPORARY IMAGE STORAGE ENDPOINTS
// Add these to your server.js file
// ====================

const multer = require('multer');

// Configure multer for file uploads (in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// In-memory storage for temporary images (you can use Redis in production)
const tempImageStore = new Map();

// Cleanup expired images every 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [imageId, data] of tempImageStore.entries()) {
    if (now > data.expiry) {
      tempImageStore.delete(imageId);
      console.log(`🗑️ Cleaned up expired temp image: ${imageId}`);
    }
  }
}, 30 * 60 * 1000); // 30 minutes

// Store temporary image endpoint
app.post('/store-temp-image', upload.single('image'), async (req, res) => {
  try {
    console.log('📤 Received temp image storage request');
    
    const { userId, filename, expiry } = req.body;
    const imageFile = req.file;
    
    if (!imageFile) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    if (!userId || !filename) {
      return res.status(400).json({ error: 'Missing userId or filename' });
    }
    
    // Generate unique image ID
    const imageId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiry time (default 2 hours)
    const expiryTime = Date.now() + (parseInt(expiry) || 7200) * 1000;
    
    // Store image data in memory
    tempImageStore.set(imageId, {
      buffer: imageFile.buffer,
      mimeType: imageFile.mimetype,
      originalName: filename,
      userId: userId,
      uploadTime: Date.now(),
      expiry: expiryTime,
      size: imageFile.size
    });
    
    console.log(`✅ Stored temp image: ${imageId} (${(imageFile.size / 1024 / 1024).toFixed(2)}MB)`);
    
    res.json({
      success: true,
      imageId: imageId,
      tempUrl: `/get-temp-image/${imageId}`,
      expiresIn: parseInt(expiry) || 7200,
      fileSize: imageFile.size
    });
    
  } catch (error) {
    console.error('❌ Error storing temp image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Retrieve temporary image endpoint
app.get('/get-temp-image/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const { userId } = req.query;
    
    console.log(`📥 Retrieving temp image: ${imageId} for user: ${userId}`);
    
    const imageData = tempImageStore.get(imageId);
    
    if (!imageData) {
      console.log(`❌ Image not found: ${imageId}`);
      return res.status(404).json({ error: 'Image not found or expired' });
    }
    
    // Verify ownership
    if (imageData.userId !== userId) {
      console.log(`❌ Access denied for image: ${imageId}`);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Check if expired
    if (Date.now() > imageData.expiry) {
      tempImageStore.delete(imageId);
      console.log(`❌ Image expired: ${imageId}`);
      return res.status(410).json({ error: 'Image expired' });
    }
    
    console.log(`✅ Serving temp image: ${imageId} (${(imageData.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Set appropriate headers
    res.set({
      'Content-Type': imageData.mimeType,
      'Content-Length': imageData.buffer.length,
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="${imageData.originalName}"`
    });
    
    res.send(imageData.buffer);
    
  } catch (error) {
    console.error('❌ Error retrieving temp image:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get temp image info (without downloading)
app.get('/temp-image-info/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const { userId } = req.query;
    
    const imageData = tempImageStore.get(imageId);
    
    if (!imageData) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    if (imageData.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (Date.now() > imageData.expiry) {
      tempImageStore.delete(imageId);
      return res.status(410).json({ error: 'Image expired' });
    }
    
    res.json({
      imageId: imageId,
      originalName: imageData.originalName,
      mimeType: imageData.mimeType,
      size: imageData.size,
      uploadTime: imageData.uploadTime,
      expiry: imageData.expiry,
      remainingTime: Math.max(0, imageData.expiry - Date.now())
    });
    
  } catch (error) {
    console.error('Error getting temp image info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Debug endpoint to see stored images
app.get('/debug-temp-images', (req, res) => {
  const images = Array.from(tempImageStore.entries()).map(([id, data]) => ({
    imageId: id,
    userId: data.userId,
    originalName: data.originalName,
    size: data.size,
    uploadTime: new Date(data.uploadTime).toISOString(),
    expiry: new Date(data.expiry).toISOString(),
    expired: Date.now() > data.expiry
  }));
  
  res.json({
    totalImages: images.length,
    images: images
  });
});








// ====================
// MAINTENANCE MODE ENDPOINTS
// ====================

const MAINTENANCE_CONFIG_PATH = '/mnt/data/maintenance_config.json';

// Helper function to read maintenance config
function readMaintenanceConfig() {
  try {
    if (!fs.existsSync(MAINTENANCE_CONFIG_PATH)) {
      const defaultConfig = {
        offline: false,
        lastUpdated: new Date().toISOString()
      };
      fs.writeFileSync(MAINTENANCE_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2));
      console.log('✅ Created new maintenance config file');
      return defaultConfig;
    }
    
    const data = fs.readFileSync(MAINTENANCE_CONFIG_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading maintenance config:', error.message);
    return { offline: false, lastUpdated: new Date().toISOString() };
  }
}

// Helper function to write maintenance config
function writeMaintenanceConfig(offline) {
  try {
    const config = {
      offline: offline,
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(MAINTENANCE_CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`✅ Maintenance config updated: ${offline ? 'OFFLINE' : 'ONLINE'}`);
    return true;
  } catch (error) {
    console.error('Error writing maintenance config:', error.message);
    return false;
  }
}

// GET endpoint - Check if site is in maintenance mode
app.get('/api/maintenance-status', (req, res) => {
  try {
    const config = readMaintenanceConfig();
    console.log(`📊 Maintenance status check: ${config.offline ? 'OFFLINE' : 'ONLINE'}`);
    
    res.json({ 
      offline: config.offline,
      timestamp: new Date().toISOString(),
      lastUpdated: config.lastUpdated
    });
  } catch (error) {
    console.error('Error checking maintenance status:', error);
    res.status(500).json({ error: error.message });
  }
});






// POST endpoint - Toggle maintenance mode (admin only)
app.post('/api/maintenance-toggle', (req, res) => {
  try {
    const { password, offline } = req.body;
    
    console.log(`🔧 Maintenance toggle request received: ${offline ? 'OFFLINE' : 'ONLINE'}`);
    
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-secret-password';
    
    if (password !== ADMIN_PASSWORD) {
      console.log('❌ Unauthorized maintenance toggle attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const success = writeMaintenanceConfig(offline);
    
    if (!success) {
      return res.status(500).json({ error: 'Failed to update maintenance status' });
    }
    
    console.log(`✅ Maintenance mode ${offline ? 'ENABLED' : 'DISABLED'}`);
    
    res.json({ 
      success: true,
      offline: offline,
      message: `Site is now ${offline ? 'OFFLINE' : 'ONLINE'}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET endpoint - Retrieve current active model and valid model list
app.get("/api/model-status", (req, res) => {
  try {
    const modelConfig = readModelConfig();
    
    if (!modelConfig) {
      return res.json({
        success: true,
        activeModel: null,
        message: "No model configured. Please select a model to activate TAA apps."
      });
    }
    
    res.json({
      success: true,
      activeModel: modelConfig.activeModel,
      lastUpdated: modelConfig.lastUpdated
    });
  } catch (error) {
    console.error("Error getting model status:", error);
    res.status(500).json({ success: false, error: "Failed to read model status" });
  }
});

// POST endpoint - Switch active model (admin only)
app.post('/api/model-switch', (req, res) => {
  try {
    const { password, model } = req.body;

    console.log(`🤖 Model switch request received: ${model}`);

    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your-secret-password';

    if (password !== ADMIN_PASSWORD) {
      console.log('❌ Unauthorized model switch attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!VALID_OPENAI_MODELS.includes(model)) {
      console.log(`❌ Invalid model requested: ${model}`);
      return res.status(400).json({ error: `Invalid model. Must be one of: ${VALID_OPENAI_MODELS.join(', ')}` });
    }

    const success = writeModelConfig(model);

    if (!success) {
      return res.status(500).json({ error: 'Failed to update model config' });
    }

    console.log(`✅ Active model switched to: ${model}`);

    res.json({
      success: true,
      activeModel: model,
      message: `Active model switched to ${model}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error switching model:', error);
    res.status(500).json({ error: error.message });
  }
});





// ====================
// API ROUTES
// ====================

// Serve full-size images from disk
app.get("/api/records/:id/full-image", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }

    const imagePath = path.join("/mnt/data/images", `record_${recordId}.jpg`);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Full image not found" });
    }

    // Set appropriate headers
    res.setHeader("Content-Type", "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours

    // Send the file
    res.sendFile(imagePath);
  } catch (error) {
    console.error("Error serving full image:", error);
    res.status(500).json({ error: "Failed to serve image" });
  }
});

// Generic endpoint for serving prompts - more maintainable approach
app.get("/prompts/:calculatorType", (req, res) => {
  const { calculatorType } = req.params;

  // First try the _prompt.txt pattern (for SMI, CLI, RI, etc.)
  let promptPath = path.join(
    __dirname,
    "public",
    "prompts",
    `${calculatorType}_prompt.txt`
  );

  // If not found, try without _prompt (for ART_ANALYSIS, etc.)
  if (!fs.existsSync(promptPath)) {
    promptPath = path.join(__dirname, "public", "prompts", `${calculatorType}.txt`);
  }

  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    res.status(404).json({
      error: { message: `Prompt for ${calculatorType} not found` }
    });
  }
});

// Legacy endpoints for backward compatibility
app.get("/PromptCalcRI.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "RI_prompt.txt");

  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    // Redirect to the new endpoint
    res.redirect("/prompts/RI");
  }
});

app.get("/PromptCalcCLI.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "CLI_prompt.txt");

  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    // Redirect to the new endpoint
    res.redirect("/prompts/CLI");
  }
});

app.get("/PromptCalcSMI.txt", (req, res) => {
  const promptPath = path.join(__dirname, "public", "prompts", "SMI_prompt.txt");

  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    // Redirect to the new endpoint
    res.redirect("/prompts/SMI");
  }
});

app.get("/PromptAnalyzeArt.txt", (req, res) => {
  const promptPath = path.join(
    __dirname,
    "public",
    "prompts",
    "PromptAnalyzeArt.txt"
  );

  if (fs.existsSync(promptPath)) {
    res.sendFile(promptPath);
  } else {
    res.status(404).json({
      error: { message: "Analyze Art prompt not found" }
    });
  }
});

// ====================
// REVISED ENDPOINT: Convert Bio to Questionnaire Only
// ====================
app.post("/analyze-cli", async (req, res) => {
  try {
    console.log("Received CLI bio-to-questionnaire request");
    const { prompt, artistName, artistResume, temperature: requestedTemp } = req.body;

    const temperature =
      typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    if (!artistName) {
      return res.status(400).json({
        error: { message: "Artist name is required" }
      });
    }

    if (!prompt) {
      return res.status(400).json({
        error: { message: "Prompt is required" }
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: { message: "Server configuration error: Missing API key" }
      });
    }

    // Handle empty or minimal bio
    if (!artistResume || artistResume.trim().length < 10) {
      console.log(
        "Empty or minimal bio provided, returning default questionnaire"
      );
      return res.json({
        questionnaire: {
          education: "none",
          exhibitions: "none",
          awards: "none",
          commissions: "none",
          collections: "none",
          publications: "none",
          institutional: "none"
        },
        source: "default_answers"
      });
    }

    console.log(
      `Processing bio-to-questionnaire for artist: "${artistName}"`
    );

    console.log("Sending bio to AI for questionnaire conversion");

    const messages = [
      {
        role: "user",
        content: `Artist: "${artistName}"\n\nArtist Career Information:\n${artistResume}\n\n${prompt}`
      }
    ];

    const systemContent =
      "You are an expert art career analyst. Analyze the artist's bio and respond with only the requested JSON format.";

    const aiResponse = await callAI(
      messages,
      500,
      systemContent,
      true,
      temperature
    );

    const requiredFields = [
      "education",
      "exhibitions",
      "awards",
      "commissions",
      "collections",
      "publications",
      "institutional"
    ];
    const missingFields = requiredFields.filter(field => !aiResponse[field]);

    if (missingFields.length > 0) {
      console.log(`AI response missing fields: ${missingFields.join(", ")}`);
      return res.status(500).json({
        error: {
          message: `AI analysis incomplete: missing ${missingFields.join(", ")}`
        }
      });
    }

    console.log("Sending questionnaire response to frontend");
    res.json({
      questionnaire: aiResponse,
      source: "ai_converted"
    });
  } catch (error) {
    console.error("Error in bio-to-questionnaire conversion:", error.message);
    res.status(500).json({
      error: { message: error.message || "Bio analysis failed" }
    });
  }
});



app.post("/generate-career-summary", async (req, res) => {
  try {
    console.log("Received career summary request");
    const questionnaire = req.body;
    const { artistName, temperature: requestedTemp } = req.body;

    const temperature =
      typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    const requiredFields = [
      "education",
      "exhibitions",
      "awards",
      "commissions",
      "collections",
      "publications",
      "institutional"
    ];
    const missingFields = requiredFields.filter(field => !questionnaire[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: {
          message: `Missing questionnaire fields: ${missingFields.join(", ")}`
        }
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({
        error: { message: "Server configuration error: Missing API key" }
      });
    }

    const summaryPrompt = `
Based on the following artist career questionnaire responses, write a neutral and academic 1-2 sentence summary about ${artistName}'s career accomplishments.

IMPORTANT: Use a conversational tone with neutral emotional valence, suitable for an academic audience. Be truthful and straightforward. Write in the 3rd person, referring to the artist by name. Focus on their accomplishments and frame any gaps as opportunities for development.

Guidelines:
- Use conversational tone with neutral emotional valence
- Write for an academic audience  
- Write in 3rd person using the artist's name
- Be straightforward about current accomplishments
- Frame gaps as "opportunities" or "potential for development"
- Avoid flowery or overly enthusiastic language
- Keep tone professional but accessible

Artist: ${artistName}

Questionnaire Responses:
- Art Education: ${questionnaire.education}
- Exhibitions: ${questionnaire.exhibitions}  
- Awards & Competitions: ${questionnaire.awards}
- Commissions: ${questionnaire.commissions}
- Collections: ${questionnaire.collections}
- Publications: ${questionnaire.publications}
- Institutional Interest: ${questionnaire.institutional}

Write exactly 1-2 sentences about ${artistName}'s current career level using neutral, academic language that acknowledges accomplishments and notes development opportunities.`;

    console.log("Generating diplomatic career summary in 3rd person");

    const messages = [
      {
        role: "user",
        content: summaryPrompt
      }
    ];

    const systemContent = `You are an art career analyst writing about ${artistName}. Use a neutral, academic tone that is conversational but not flowery. Be straightforward and professional.`;

    const summaryText = await callAI(
      messages,
      200,
      systemContent,
      false,
      temperature
    );

    console.log("Diplomatic career summary generated successfully");
    res.json({
      summary: summaryText.trim()
    });
  } catch (error) {
    console.error("Error generating career summary:", error.message);
    res.status(500).json({
      error: { message: "Failed to generate career summary: " + error.message }
    });
  }
});








// Endpoint for Skill Mastery Index (SMI) analysis
app.post("/analyze-smi", async (req, res) => {
  try {
    console.log("Received SMI analyze request");
    const {
      prompt,
      image,
      artTitle,
      artistName,
	  subjectPhrase,
      temperature: requestedTemp,
	  returnFactorScores
    } = req.body;

    const temperature =
      typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    if (!prompt) {
      console.log("Missing prompt in request");
      return res
        .status(400)
        .json({ error: { message: "Prompt is required" } });
    }

    if (!image) {
      console.log("Missing image in request");
      return res
        .status(400)
        .json({ error: { message: "Image is required" } });
    }

    if (!OPENAI_API_KEY) {
      console.log("Missing API key");
      return res.status(500).json({
        error: {
          message: "Server configuration error: Missing API key"
        }
      });
    }

    // Log info about the request
    console.log(
      `Processing SMI request for artwork: "${artTitle}" by ${artistName}`
    );
    console.log(`Prompt length: ${prompt.length} characters`);
	if (returnFactorScores) {
  console.log("✓ Factor scores requested for batch processing");
}

    // Construct the prompt with artwork information
let finalPrompt = `Title: "${artTitle}"
Artist: "${artistName}"

${prompt}`;

// Append factor score instructions for batch processing
if (returnFactorScores) {
  finalPrompt += `

═══════════════════════════════════════════════════════════════════════════════
ADDITIONAL OUTPUT REQUIREMENT FOR BATCH PROCESSING
═══════════════════════════════════════════════════════════════════════════════

In addition to the standard JSON output, include an array called "factor_scores" 
containing the individual score you assigned to each of the 33 factors.

The array must contain EXACTLY 33 numbers in this exact order:
[F1, F2, F3, ..., F33]

Where:
- F1-F10 = Core Elements
- F11-F20 = Design Principles  
- F21-F28 = Techniques
- F29-F33 = Artistic Voice

**Score values:**
- Use 1, 3, or 5 for factors you scored
- Use 0 for factors you scored as NA (Not Applicable)

Add this to your JSON output:
{
  "smi": 3.4,
  "category_summaries": { ... },
  "brief_description": "...",
  "factor_scores": [3, 3, 3, 3, 3, 1, 3, 3, 3, 3, 3, 5, 3, 3, 3, 3, 3, 3, 3, 3, 3, 0, 0, 0, 3, 0, 0, 3, 3, 3, 3, 3, 3]
}

**CRITICAL:** Array must have EXACTLY 33 values in correct order.`;
}



    console.log("Sending request to AI for SMI analysis (33 factors)");

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: finalPrompt },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${image}` }
          }
        ]
      }
    ];

    const systemContent =
      "You are an expert fine art analyst specializing in evaluating artistic skill mastery across 33 essential factors. Your task is to analyze the provided artwork and calculate the Skill Mastery Index (SMI) using the weighted 33-factor system. Return your analysis in valid JSON format only, following the prompt instructions exactly.";

    let analysisText;
    try {
      // useJSON = false here because we manually clean/parse JSON from the text
      analysisText = await callAI(
        messages,
        3000,
        systemContent,
        false,
        temperature
      ); // Increased token limit for 33 factors
      console.log("SMI Analysis completed successfully");
    } catch (error) {
      console.log("AI request failed:", error.message);
      return res.status(500).json({
        error: { message: "AI analysis failed: " + error.message }
      });
    }

    console.log("Raw AI response:", analysisText);

    // Parse the JSON response from AI
    let aiResponse;
    try {
      // Clean up the response - remove any markdown code blocks or extra text
      let cleanResponse = analysisText.trim();

      // Remove code block markers if present
      if (cleanResponse.startsWith("```json")) {
        cleanResponse = cleanResponse
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanResponse.startsWith("```")) {
        cleanResponse = cleanResponse
          .replace(/^```\s*/, "")
          .replace(/\s*```$/, "");
      }

      // Find JSON object if there's extra text
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanResponse = jsonMatch[0];
      }

      aiResponse = JSON.parse(cleanResponse);
      console.log("Successfully parsed AI JSON response");
    } catch (parseError) {
      console.log("Failed to parse AI response as JSON:", parseError.message);
      console.log("AI response was:", analysisText);
      return res.status(500).json({
        error: {
          message: "AI did not return valid JSON format. Please try again."
        }
      });
    }

    // Validate the NEW JSON structure (33-factor system)
    if (!aiResponse.category_summaries) {
      console.log("Missing category_summaries in AI response");
      return res.status(500).json({
        error: {
          message: "Invalid AI response: missing category_summaries"
        }
      });
    }

    if (!aiResponse.smi) {
      console.log("Missing SMI value in AI response");
      return res.status(500).json({
        error: {
          message: "Invalid AI response: missing smi value"
        }
      });
    }

    // Validate category_summaries structure
    const requiredSummaries = [
      "core_elements",
      "design_principles",
      "techniques",
      "artistic_voice"
    ];
    const categorySummaries = aiResponse.category_summaries;

    for (const category of requiredSummaries) {
      if (
        !categorySummaries[category] ||
        typeof categorySummaries[category] !== "string"
      ) {
        console.log(`Missing or invalid summary for: ${category}`);
        return res.status(500).json({
          error: {
            message: `Missing or invalid summary for category: ${category}`
          }
        });
      }
    }

// NEW: Validate factor scores if requested
if (returnFactorScores) {
  if (!aiResponse.factor_scores || !Array.isArray(aiResponse.factor_scores)) {
    console.log("Missing or invalid factor_scores array in AI response");
    return res.status(500).json({
      error: {
        message: "Invalid AI response: missing or invalid factor_scores array"
      }
    });
  }
  
  if (aiResponse.factor_scores.length !== 33) {
    console.log(`Expected 33 factor scores, got ${aiResponse.factor_scores.length}`);
    return res.status(500).json({
      error: {
        message: `Invalid AI response: expected 33 factor scores, got ${aiResponse.factor_scores.length}`
      }
    });
  }
  
  // Validate each score is 0, 1, 3, or 5
  for (let i = 0; i < aiResponse.factor_scores.length; i++) {
    const score = aiResponse.factor_scores[i];
    if (![0, 1, 3, 5].includes(score)) {
      console.log(`Invalid factor score at position ${i + 1}: ${score}`);
      return res.status(500).json({
        error: {
          message: `Invalid factor score at position ${i + 1}: ${score}. Must be 0, 1, 3, or 5.`
        }
      });
    }
  }
  
  console.log("✓ Factor scores validated: 33 scores received");
}



    // Validate SMI value
    const smiValue = parseFloat(aiResponse.smi);
    if (isNaN(smiValue) || smiValue < 1.0 || smiValue > 5.0) {
      console.log(`Invalid SMI value: ${aiResponse.smi}`);
      return res.status(500).json({
        error: {
          message: `Invalid SMI value: ${aiResponse.smi}. Must be between 1.0 and 5.0`
        }
      });
    }

    // Ensure SMI is formatted to 2 decimal places
    const formattedSMI = smiValue.toFixed(2);
    console.log(`SMI Value: ${formattedSMI}`);
    console.log("All category summaries validated successfully");

// Prepare final response
const finalResponse = {
  smi: formattedSMI,
  category_summaries: categorySummaries,
  brief_description: aiResponse.brief_description || "",
  ai_response: aiResponse
};

// NEW: Include factor scores if requested
if (returnFactorScores && aiResponse.factor_scores) {
  finalResponse.factor_scores = aiResponse.factor_scores;
  console.log("✓ Including factor scores in response");
}

console.log("Sending final SMI response to client");
res.json(finalResponse);
	
	
	
	
  } catch (error) {
    console.error("Unexpected error in SMI analysis:", error);
    res.status(500).json({
      error: {
        message: "Internal server error during analysis"
      }
    });
  }
});

// Error handler function
function handleApiError(error, res) {
  console.error("Error in API endpoint:", error);

  // Detailed error logging
  if (error.response) {
    console.error("Response status:", error.response.status);
    console.error("Response headers:", error.response.headers);
    console.error("Response data:", JSON.stringify(error.response.data));
  } else if (error.request) {
    console.error("No response received:", error.request);
  } else {
    console.error("Error setting up request:", error.message);
  }

  const errorMessage =
    error.response?.data?.error?.message ||
    error.message ||
    "An unknown error occurred";

  res.status(500).json({
    error: {
      message: errorMessage,
      details: error.toString()
    }
  });
}

// Endpoint for Representational Index (RI) analysis
app.post("/analyze-ri", async (req, res) => {
  try {
    console.log("Received RI analyze request");
    const {
      prompt,
      image,
      artTitle,
      artistName,
      temperature: requestedTemp
    } = req.body;

    const temperature =
      typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    if (!prompt) {
      console.log("Missing prompt in request");
      return res
        .status(400)
        .json({ error: { message: "Prompt is required" } });
    }

    if (!image) {
      console.log("Missing image in request");
      return res
        .status(400)
        .json({ error: { message: "Image is required" } });
    }

    if (!OPENAI_API_KEY) {
      console.log("Missing API key");
      return res.status(500).json({
        error: {
          message: "Server configuration error: Missing API key"
        }
      });
    }

    console.log(
      `Processing RI request for artwork: "${artTitle}" by ${artistName}`
    );
    console.log(`Prompt length: ${prompt.length} characters`);





    // Construct the prompt with artwork information
	const finalPrompt = prompt;  // Use exactly what frontend sent!





    console.log("Sending request to AI for RI analysis");

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: finalPrompt },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${image}` }
          }
        ]
      }
    ];

    const systemContent =
      "You are an expert fine art analyst specializing in evaluating representational accuracy. Respond with ONLY valid JSON.";

    let aiResponse;
    try {
      // Request JSON response from AI (useJSON = true)
      aiResponse = await callAI(
        messages,
        1500,
        systemContent,
        true,
        temperature
      );
      console.log("RI Analysis completed successfully");
    } catch (error) {
      console.log("AI request failed:", error.message);
      return res.status(500).json({
        error: { message: "AI analysis failed: " + error.message }
      });
    }

    // Validate JSON structure
    if (!aiResponse.ri_score || !aiResponse.category || !aiResponse.analysis) {
      console.error("Invalid RI response structure from AI");
      return res.status(500).json({
        error: { message: "AI returned invalid response structure" }
      });
    }

    // Validate RI score is between 1-5
    if (aiResponse.ri_score < 1 || aiResponse.ri_score > 5) {
      console.error(`Invalid RI score: ${aiResponse.ri_score}`);
      return res.status(500).json({
        error: {
          message: `Invalid RI score: ${aiResponse.ri_score}. Must be between 1-5`
        }
      });
    }

    // Convert JSON to markdown format for frontend
    const markdownReport = `
## Representational Index (RI): ${aiResponse.ri_score}

**Category:** ${aiResponse.category}

### Summary
${aiResponse.summary.trim()}

## Analysis

#### Subject Recognizability
${aiResponse.analysis.subject_recognizability}

#### Fidelity to Reality
${aiResponse.analysis.fidelity_to_reality}

#### Perspective & Depth
${aiResponse.analysis.perspective_depth}

#### Detail & Texture
${aiResponse.analysis.detail_texture}

#### Real-World Reference
${aiResponse.analysis.real_world_reference}

### Explanation
${aiResponse.explanation}
`;

    console.log("Sending RI analysis response to client");
    res.json({
      analysis: markdownReport.trim(),
      ri_score: aiResponse.ri_score,
      category: aiResponse.category
    });
  } catch (error) {
    console.error("Unexpected error in RI analysis:", error);
    res.status(500).json({
      error: {
        message: "Internal server error during analysis"
      }
    });
  }
});



// =======================================
// ART VALUATION SYSTEM API ENDPOINTS
// =======================================

// Path to your JSON database and images directory
const DB_PATH = '/mnt/data/art_database.json';

function encodeImageWithMime(buffer, originalName) {
  const mimeType = mime.lookup(originalName) || "image/jpeg";
  const base64 = buffer.toString("base64");
  return { imageBase64: `data:${mimeType};base64,${base64}`, mimeType };
}

function readDatabase() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      const emptyDb = {
        metadata: {
          lastUpdated: new Date().toISOString(),
          coefficients: {
            constant: 100,
            exponent: 0.5,
            lastCalculated: new Date().toISOString()
          }
        },
        records: []
      };
      fs.writeFileSync(DB_PATH, JSON.stringify(emptyDb, null, 2));
      return emptyDb;
    }

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

// Ensure all records have imageMimeType if imageBase64 is present
if (Array.isArray(data.records)) {
  data.records.forEach(record => {
    if (record.imageBase64 && !record.imageMimeType) {
      record.imageMimeType = 'image/jpeg'; // default fallback
    }
  });
}

return data;

  } catch (error) {
    console.error('Error reading database:', error);
    throw new Error('Database error: ' + error.message);
  }
}

function writeDatabase(data) {
    try {
        console.log(`Writing to database: ${DB_PATH}, records: ${data.records.length}`);
        const dbDir = path.dirname(DB_PATH);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            console.log(`Created directory: ${dbDir}`);
        }
        if (fs.existsSync(DB_PATH)) {
            fs.chmodSync(DB_PATH, 0o666);
            console.log(`Set permissions to 666 for ${DB_PATH}`);
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), { flag: 'w' });
        console.log(`Database write successful`);
    } catch (error) {
        console.error(`Error writing database: ${error.message}, stack: ${error.stack}`);
        throw new Error(`Failed to write database: ${error.message}`);
    }
}



// ====================================================
// COMPLETE REPLACEMENT: Update All APPSI Function
// ====================================================
function updateAllAPPSI(data) {
  data.records.forEach(record => {
    if (record.ppsi && record.size) {
      record.appsi = calculateAPPSI(record.size, record.ppsi, data.metadata.coefficients);
    }
  });
  return data;
}

// ====================================================
// Calculate R-Squared Function
// ====================================================

function calculateRSquared(points, constant, exponent) {
  let sumResidualSquared = 0;
  let sumTotalSquared = 0;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
  
  for (const point of points) {
    const predicted = constant * Math.pow(point.x, exponent);
    sumResidualSquared += Math.pow(point.y - predicted, 2);
    sumTotalSquared += Math.pow(point.y - meanY, 2);
  }
  
  return 1 - (sumResidualSquared / sumTotalSquared);
}

// ====================================================
// DATA ACCESS ENDPOINTS
// ====================================================

app.post('/api/admin/create-backup', async (req, res) => {
  try {
    const dbPath = '/mnt/data/art_database.json';
    const imagesDir = '/mnt/data/images';
    const backupDir = '/mnt/data';
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
    const backupFileName = `backup_art_database_${timestamp}.zip`;
    const backupPath = path.join(backupDir, backupFileName);

    // Read database to get list of records
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    console.log(`Creating backup with ${data.records.length} records`);

    // Create ZIP archive
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    let missingImageCount = 0;

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        const publicUrl = `/download/${backupFileName}`;
        console.log(`✅ Backup created: ${backupFileName} (${archive.pointer()} bytes)`);
        if (missingImageCount > 0) {
          console.log(`⚠️ Warning: ${missingImageCount} records had missing full images`);
        }
        resolve(res.json({ 
          message: `Backup created: ${backupFileName}`, 
          downloadUrl: publicUrl,
          warnings: missingImageCount > 0 ? `${missingImageCount} records had missing full images` : null
        }));
      });

      output.on('error', (err) => {
        console.error('❌ Backup output stream error:', err);
        reject(res.status(500).json({ error: 'Failed to create backup file.' }));
      });

      archive.on('error', (err) => {
        console.error('❌ Archive creation error:', err);
        reject(res.status(500).json({ error: 'Failed to create backup archive.' }));
      });

      archive.pipe(output);

      // Add database JSON to root of ZIP
      archive.file(dbPath, { name: 'art_database.json' });

      // Add all image files to images/ folder in ZIP
      data.records.forEach(record => {
        const imagePath = path.join(imagesDir, `record_${record.id}.jpg`);
        if (fs.existsSync(imagePath)) {
          archive.file(imagePath, { name: `images/record_${record.id}.jpg` });
        } else {
          console.log(`⚠️ Warning: Missing full image for record ${record.id}`);
          missingImageCount++;
        }
      });

      archive.finalize();
    });

  } catch (err) {
    console.error("❌ Failed to create backup:", err);
    res.status(500).json({ error: "Failed to create backup: " + err.message });
  }
});

// GET all records
app.get("/api/records", (req, res) => {
  try {
    const data = readDatabase();
    const includeInactive = req.query.inactive === 'true';
    
    let records = data.records;
    if (!includeInactive) {
      records = records.filter(record => record.isActive !== false);
    }
    
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET statistical information
app.get("/api/stats", (req, res) => {
  try {
    const data = readDatabase();
    
    // All records are active (deleted records are physically removed)
    const totalRecords = data.records.length;
    
    // Find records missing required fields (SMI, RI, CLI, PPSI, SSI)
    const incompleteRecords = [];
    
    data.records.forEach(record => {
      const requiredFields = ['smi', 'ri', 'cli', 'ppsi', 'size']; // size is SSI
      const missingFields = [];
      
      requiredFields.forEach(field => {
        const value = record[field];
        // Check if field is null, undefined, or 0
        if (value === null || value === undefined || value === 0) {
          missingFields.push(field);
        }
      });
      
      // If any required fields are missing, add to incomplete list
      if (missingFields.length > 0) {
        incompleteRecords.push(record.id);
      }
    });
    
    const stats = {
      totalRecords: totalRecords,
      missingRequiredFields: incompleteRecords.length,
      missingRequiredFieldsIds: incompleteRecords,
      lastUpdated: data.metadata.lastUpdated
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/records/:id/image", (req, res) => {
    console.log(`PATCH /api/records/${req.params.id}/image called`);
    try {
        const recordId = parseInt(req.params.id);
        if (isNaN(recordId)) {
            return res.status(400).json({ error: "Invalid record ID" });
        }
        const { imageBase64 } = req.body;
        if (!imageBase64 || typeof imageBase64 !== "string" || !imageBase64.startsWith("data:image")) {
            return res.status(400).json({ error: "Invalid or missing Base64 image data" });
        }
        const data = readDatabase();
        const record = data.records.find(r => r.id === recordId);
        if (!record) {
            return res.status(404).json({ error: "Record not found" });
        }
        const mimeMatch = imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        record.imageBase64 = imageBase64;
        record.imageMimeType = mimeType;
        writeDatabase(data);
        res.json({ success: true, recordId: record.id, mimeType });
    } catch (error) {
        console.error("Error patching imageBase64:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/records/:id/image", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const data = readDatabase();
    const record = data.records.find(r => r.id === recordId);
    
    if (!record || !record.imageBase64) {
      return res.status(404).json({ error: "Image not found" });
    }

    const match = record.imageBase64.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.*)$/);
    if (!match) {
      return res.status(500).json({ error: "Malformed imageBase64 format" });
    }

    const mimeType = match[1];
    const imageData = Buffer.from(match[2], "base64");

    res.setHeader("Content-Type", mimeType);
    res.send(imageData);
  } catch (error) {
    console.error("Image fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET single record by ID
app.get("/api/records/:id", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: 'Invalid record ID' });
    }
    
    const data = readDatabase();
    const record = data.records.find(r => r.id === recordId);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET all metadata (coefficients + medium multipliers)
app.get("/api/coefficients", (req, res) => {
  try {
    const data = readDatabase();
    
    // Return complete metadata structure
    const metadata = {
      coefficients: data.metadata.coefficients || {},
      medium: data.metadata.medium || {},
      lastUpdated: data.metadata.lastUpdated,
      lastCalculated: data.metadata.lastCalculated
    };
    
    res.json(metadata);
  } catch (error) {
    console.error('Error loading metadata:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/replace-database', async (req, res) => {
  try {
    console.log('Starting full database and images restore from ZIP');
    
    if (!req.body || !req.body.zipBase64) {
      return res.status(400).json({ error: "Request body must include 'zipBase64' field." });
    }

    const zipBase64 = req.body.zipBase64;
    const tempDir = '/mnt/data/temp_restore';
    const dbPath = '/mnt/data/art_database.json';
    const imagesDir = '/mnt/data/images';
    const backupDbPath = `${dbPath}.backup_${Date.now()}`;
    const backupImagesDir = `${imagesDir}_backup_${Date.now()}`;

    // Create temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    try {
      // Step 1: Extract ZIP to temp directory
      console.log('Extracting ZIP file...');
      const zipBuffer = Buffer.from(zipBase64, 'base64');
      const tempZipPath = path.join(tempDir, 'backup.zip');
      fs.writeFileSync(tempZipPath, zipBuffer);

      // Extract ZIP contents
      await new Promise((resolve, reject) => {
        fs.createReadStream(tempZipPath)
          .pipe(unzipper.Extract({ path: tempDir }))
          .on('close', resolve)
          .on('error', reject);
      });

      // Step 2: Validate extracted contents
      const extractedDbPath = path.join(tempDir, 'art_database.json');
      const extractedImagesDir = path.join(tempDir, 'images');

      if (!fs.existsSync(extractedDbPath)) {
        throw new Error('Invalid backup: art_database.json not found in ZIP');
      }

      console.log('Validating database structure...');
      const restoredData = JSON.parse(fs.readFileSync(extractedDbPath, 'utf-8'));
      
      if (!restoredData.records || !Array.isArray(restoredData.records)) {
        throw new Error('Invalid backup: missing or invalid records array');
      }

      console.log(`Validated database with ${restoredData.records.length} records`);

      // Step 3: Create backups of current data
      console.log('Creating safety backups of current data...');
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupDbPath);
      }
      if (fs.existsSync(imagesDir)) {
        fs.cpSync(imagesDir, backupImagesDir, { recursive: true });
      }

      // Step 4: Restore database
      console.log('Restoring database...');
      fs.writeFileSync(dbPath, JSON.stringify(restoredData, null, 2));

      // Step 5: Restore images
      console.log('Restoring images...');
      
      // Clear existing images directory
      if (fs.existsSync(imagesDir)) {
        fs.rmSync(imagesDir, { recursive: true });
      }
      fs.mkdirSync(imagesDir, { recursive: true });

      let restoredImageCount = 0;
      let missingImageCount = 0;

      if (fs.existsSync(extractedImagesDir)) {
        const imageFiles = fs.readdirSync(extractedImagesDir);
        
        for (const filename of imageFiles) {
          const sourcePath = path.join(extractedImagesDir, filename);
          const destPath = path.join(imagesDir, filename);
          
          try {
            fs.copyFileSync(sourcePath, destPath);
            restoredImageCount++;
          } catch (err) {
            console.error(`Failed to restore image ${filename}:`, err);
            throw new Error(`Failed to restore image ${filename}: ${err.message}`);
          }
        }
      }

      // Verify all records have corresponding images
      restoredData.records.forEach(record => {
        const imagePath = path.join(imagesDir, `record_${record.id}.jpg`);
        if (!fs.existsSync(imagePath)) {
          console.log(`⚠️ Warning: Record ${record.id} has no corresponding full image`);
          missingImageCount++;
        }
      });

      // Step 6: Cleanup
      console.log('Cleaning up temporary files...');
      fs.rmSync(tempDir, { recursive: true });
      
      // Remove safety backups on success
      if (fs.existsSync(backupDbPath)) {
        fs.unlinkSync(backupDbPath);
      }
      if (fs.existsSync(backupImagesDir)) {
        fs.rmSync(backupImagesDir, { recursive: true });
      }

      console.log('✅ Restore completed successfully');
      res.json({ 
        message: "Database and images restored successfully.",
        recordCount: restoredData.records.length,
        restoredImages: restoredImageCount,
        missingImages: missingImageCount,
        warnings: missingImageCount > 0 ? `${missingImageCount} records have no corresponding full image` : null
      });

    } catch (error) {
      // ROLLBACK: Restore from safety backups
      console.error('❌ Restore failed, rolling back changes:', error.message);
      
      try {
        if (fs.existsSync(backupDbPath)) {
          fs.copyFileSync(backupDbPath, dbPath);
          fs.unlinkSync(backupDbPath);
          console.log('✅ Database rollback completed');
        }
        
        if (fs.existsSync(backupImagesDir)) {
          if (fs.existsSync(imagesDir)) {
            fs.rmSync(imagesDir, { recursive: true });
          }
          fs.cpSync(backupImagesDir, imagesDir, { recursive: true });
          fs.rmSync(backupImagesDir, { recursive: true });
          console.log('✅ Images rollback completed');
        }
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError.message);
      }

      // Cleanup temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
      }

      throw error; // Re-throw to trigger catch block below
    }

  } catch (err) {
    console.error("❌ Restore operation failed:", err.message);
    res.status(500).json({ 
      error: "Failed to restore database and images: " + err.message 
    });
  }
});

// Pagination endpoint
app.get('/api/records/page/:pageNumber', (req, res) => {
  try {
    const page = parseInt(req.params.pageNumber) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const database = readDatabase();
    
    // Apply any filters from query params
    let filteredRecords = database;
    if (req.query.year) {
      filteredRecords = filteredRecords.filter(r => r.year == req.query.year);
    }
    if (req.query.minPrice) {
      filteredRecords = filteredRecords.filter(r => r.price >= req.query.minPrice);
    }
    
    const totalRecords = filteredRecords.length;
    const totalPages = Math.ceil(totalRecords / limit);
    const paginatedRecords = filteredRecords.slice(offset, offset + limit);
    
    res.json({
      records: paginatedRecords,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords,
        recordsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Pagination error:', error);
    res.status(500).json({ error: 'Failed to load paginated records' });
  }
});

app.post('/api/records/batch-delete', (req, res) => {
  try {
    const { recordIds } = req.body;
    const data = readDatabase(); // Using 'data' instead of 'database' for clarity
    
    // ✅ CORRECT: Work with data.records array
    const initialCount = data.records.length;
    const updatedRecords = data.records.filter(record => !recordIds.includes(record.id));
    const deletedCount = initialCount - updatedRecords.length;
    
    // ✅ CORRECT: Update the records array in the data object
    data.records = updatedRecords;
    data.metadata.lastUpdated = new Date().toISOString(); // Also update timestamp
    writeDatabase(data);
    
    console.log(`✅ Batch deleted ${deletedCount} records: ${recordIds.join(', ')}`);
    res.json({ 
      success: true, 
      deletedCount: deletedCount,
      remainingRecords: updatedRecords.length 
    });
  } catch (error) {
    console.error('❌ Batch delete failed:', error);
    res.status(500).json({ error: 'Batch delete failed' });
  }
});

app.delete("/api/records/:id", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    if (isNaN(recordId)) {
      return res.status(400).json({ error: "Invalid record ID" });
    }

    const data = readDatabase();
    const index = data.records.findIndex(record => record.id === recordId);

    if (index === -1) {
      return res.status(404).json({ error: "Record not found" });
    }

    data.records.splice(index, 1);
    writeDatabase(data);

    res.json({ message: "Record permanently deleted" });
  } catch (error) {
    console.error("Error deleting record:", error.message);
    res.status(500).json({ error: "Failed to delete record." });
  }
});

app.get("/api/coefficients/calculate", (req, res) => {
  try {
    const data = readDatabase();
    const activeRecords = data.records.filter(record => 
      record.isActive !== false && record.size && record.ppsi);
    
    if (activeRecords.length < 10) {
      return res.status(400).json({ 
        error: 'Not enough active records for reliable coefficient calculation' 
      });
    }
    
    // Extract LSSI and PPSI data (without log-transforming PPSI)
    const points = activeRecords.map(record => ({
      x: Math.log(record.size), // LSSI
      y: record.ppsi            // PPSI (not log-transformed)
    }));
    
    // Simple non-linear regression approach:
    // 1. Try different exponents
    // 2. For each exponent, find the optimal constant C
    // 3. Choose the exponent that gives the best R^2
    
    let bestExponent = 0;
    let bestConstant = 0;
    let bestR2 = -Infinity;
    
    // Try exponents from -5 to 5 in small increments
    for (let e = -5; e <= 5; e += 0.1) {
      // For a given exponent, find the optimal constant
      let sumXeY = 0;  // Sum of x^e * y
      let sumXe2 = 0;  // Sum of (x^e)^2
      
      for (const point of points) {
        const xPowE = Math.pow(point.x, e);
        sumXeY += xPowE * point.y;
        sumXe2 += xPowE * xPowE;
      }
      
      const constant = sumXeY / sumXe2;
      
      // Calculate R^2 for this model
      let sumResidualSquared = 0;
      let sumTotalSquared = 0;
      const meanY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      
      for (const point of points) {
        const predicted = constant * Math.pow(point.x, e);
        sumResidualSquared += Math.pow(point.y - predicted, 2);
        sumTotalSquared += Math.pow(point.y - meanY, 2);
      }
      
      const r2 = 1 - (sumResidualSquared / sumTotalSquared);
      
      // If this is better than our previous best, update
      if (r2 > bestR2) {
        bestR2 = r2;
        bestExponent = e;
        bestConstant = constant;
      }
    }
    
    // Create proposed coefficients object
    const proposedCoefficients = {
      exponent: bestExponent,
      constant: bestConstant,
      r2: bestR2
    };
    
    res.json({
      current: data.metadata.coefficients,
      proposed: proposedCoefficients
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



function formatAIAnalysisForReport(aiAnalysis) {
  if (!aiAnalysis) return '';
  
  try {
    // Use the same JSON cleaning logic that's already in callClaudeAPI
    let cleanJson = aiAnalysis;
    if (aiAnalysis.includes('```json')) {
      cleanJson = aiAnalysis.replace(/```json\s*/, '').replace(/\s*```$/, '');
    }
    
    // Find the JSON object
    const startIndex = cleanJson.indexOf('{');
    if (startIndex === -1) {
      throw new Error('No JSON object found');
    }
    
    let braceCount = 0;
    let endIndex = startIndex;
    
    for (let i = startIndex; i < cleanJson.length; i++) {
      if (cleanJson[i] === '{') braceCount++;
      if (cleanJson[i] === '}') braceCount--;
      if (braceCount === 0) {
        endIndex = i;
        break;
      }
    }
    
    const jsonOnly = cleanJson.substring(startIndex, endIndex + 1);
    const analysis = JSON.parse(jsonOnly);
    
    // Format as readable text
    let formattedText = '';
    
    if (analysis.overview) {
      formattedText += analysis.overview;
    }
    
    if (analysis.strengths && analysis.strengths.length > 0) {
      formattedText += '\n\nStrengths: ';
      formattedText += analysis.strengths.map(s => 
        `${s.title} - ${s.description}`
      ).join(' ');
    }
    
    if (analysis.opportunities && analysis.opportunities.length > 0) {
      formattedText += '\n\nAreas for Development: ';
      formattedText += analysis.opportunities.map(opp => {
        let text = opp.category || '';
        if (opp.steps) {
          text += ' ' + opp.steps.map(step => step.description).filter(d => d).join(' ');
        }
        return text;
      }).join(' ');
    }
    
    return convertToSentenceCase(formattedText.trim());
    
  } catch (e) {
    console.error('Error formatting AI analysis:', e);
    return convertToSentenceCase(String(aiAnalysis).replace(/[\{\}"]/g, '').trim());
  }
}



function convertToSentenceCase(text) {
  if (!text) return '';
  
  const uppercaseCount = (text.match(/[A-Z]/g) || []).length;
  const letterCount = (text.match(/[A-Za-z]/g) || []).length;
  
  if (uppercaseCount / letterCount > 0.7) {
    return text.toLowerCase().replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase());
  }
  
  return text;
}


// Updated API endpoints with full artOnlyPrice and new APPSI calculation support

// Helper function - add this near your other helper functions
function calculateArtOnlyPrice(price, framed, frameCoefficients) {
    if (!price || price <= 0) return 0;
    
    let framePercent = 0;
    
    if (framed === 'Y' && frameCoefficients && 
        frameCoefficients['frame-constant'] !== undefined && 
        frameCoefficients['frame-exponent'] !== undefined) {
        
        framePercent = frameCoefficients['frame-constant'] * 
                      Math.pow(price, frameCoefficients['frame-exponent']);
        
        // Clamp between 0 and 1 (0% to 100%)
        framePercent = Math.max(0, Math.min(1, framePercent));
    }
    
    const frameValue = price * framePercent;
    const artOnlyPrice = price - frameValue;
    
    return Math.max(0, artOnlyPrice);
}

// Updated APPSI calculation function - uses artOnlyPrice instead of price
function calculateAPPSI(size, artOnlyPrice, coefficients) {
    if (!size || !artOnlyPrice || !coefficients || 
        !coefficients.constant || !coefficients.exponent || 
        size <= 0 || artOnlyPrice <= 0) return 0;
    
    try {
        const artOnlyPPSI = artOnlyPrice / size; // New variable using artOnlyPrice
        const lssi = Math.log(size);
        const predictedPPSI = coefficients.constant * Math.pow(lssi, coefficients.exponent);
        const residualPercentage = (artOnlyPPSI - predictedPPSI) / predictedPPSI; // Only change: use artOnlyPPSI
        const standardLSSI = Math.log(200);
        const predictedPPSIStandard = coefficients.constant * Math.pow(standardLSSI, coefficients.exponent);
        const appsi = predictedPPSIStandard * (1 + residualPercentage);
        
        return isFinite(appsi) && appsi > 0 ? appsi : 0;
    } catch (error) {
        console.error("APPSI calculation error: " + error.message);
        return 0;
    }
}

// Updated POST /api/records
app.post("/api/records", (req, res) => {
    try {
        const data = readDatabase();
        const requiredFields = ['artistName', 'title', 'height', 'width', 'price'];
        for (const field of requiredFields) {
            if (!req.body[field]) {
                return res.status(400).json({ error: `Missing required field: ${field}` });
            }
        }
        
        console.log(`Total records: ${data.records.length}`);
        const maxId = data.records.length > 0
            ? data.records.reduce((max, record) => {
                const id = Number(record.id);
                return isNaN(id) ? max : Math.max(max, id);
            }, 0)
            : 0;
        console.log(`Calculated maxId: ${maxId}`);
        const newId = maxId + 1;
        
        // Remove the id field from req.body before spreading
        const { id, ...bodyWithoutId } = req.body;

        const newRecord = {
            id: newId,
            isActive: true,
            dateAdded: new Date().toISOString(),
            ...bodyWithoutId
        };

        // Calculate size and LSSI
        newRecord.size = newRecord.height * newRecord.width;
        if (newRecord.size > 0) {
            newRecord.lssi = Math.log(newRecord.size);
        }
        
        // Calculate PPSI (unchanged - still total price / size for reference)
        newRecord.ppsi = newRecord.price / newRecord.size;
        
        // Calculate artOnlyPrice using frame coefficients
        newRecord.artOnlyPrice = calculateArtOnlyPrice(
            newRecord.price, 
            newRecord.framed || 'N', 
            data.metadata.coefficients
        );
        
        // Calculate APPSI using artOnlyPrice (new method)
        if (newRecord.size > 0 && newRecord.artOnlyPrice > 0) {
            newRecord.appsi = calculateAPPSI(
                newRecord.size, 
                newRecord.artOnlyPrice, 
                data.metadata.coefficients
            );
        }
        
        delete newRecord.imagePath;
        data.records.push(newRecord);
        console.log(`New record: ID=${newId}, Artist=${newRecord.artistName}, Title=${newRecord.title}, artOnlyPrice=${newRecord.artOnlyPrice}, APPSI=${newRecord.appsi}`);
        writeDatabase(data);
        
        console.log(`Returning record with ID: ${newRecord.id}`);
        res.status(201).json({ ...newRecord, id: newId });
    } catch (error) {
        console.error('Error saving record:', error.message, error.stack);
        res.status(500).json({ error: error.message });
    }
});

// Updated PUT /api/records/:id
app.put("/api/records/:id", (req, res) => {
    try {
        const recordId = parseInt(req.params.id);
        if (isNaN(recordId)) {
            return res.status(400).json({ error: 'Invalid record ID' });
        }
        
        const data = readDatabase();
        const index = data.records.findIndex(r => r.id === recordId);
       
        if (index === -1) {
            return res.status(404).json({ error: 'Record not found' });
        }
        
        const updatedRecord = {
            ...data.records[index],
            ...req.body,
            id: recordId, // Ensure ID doesn't change
            dateAdded: data.records[index].dateAdded // Preserve original dateAdded
        };

        // Recalculate derived fields if height/width/price/framed changed
        if (req.body.height || req.body.width || req.body.price || req.body.framed !== undefined) {
            updatedRecord.size = updatedRecord.height * updatedRecord.width;
            
            // Calculate LSSI (Log of Size in Square Inches)
            if (updatedRecord.size > 0) {
                updatedRecord.lssi = Math.log(updatedRecord.size);
            }
            
            // Calculate PPSI (unchanged - still total price / size for reference)
            updatedRecord.ppsi = updatedRecord.price / updatedRecord.size;
            
            // Calculate artOnlyPrice using frame coefficients
            updatedRecord.artOnlyPrice = calculateArtOnlyPrice(
                updatedRecord.price, 
                updatedRecord.framed || 'N', 
                data.metadata.coefficients
            );
            
            // Calculate APPSI using artOnlyPrice (new method)
            if (updatedRecord.size > 0 && updatedRecord.artOnlyPrice > 0) {
                updatedRecord.appsi = calculateAPPSI(
                    updatedRecord.size, 
                    updatedRecord.artOnlyPrice, 
                    data.metadata.coefficients
                );
            }
        } else if (!updatedRecord.lssi && updatedRecord.size > 0) {
            // Ensure LSSI exists even if height/width didn't change
            updatedRecord.lssi = Math.log(updatedRecord.size);
            
            // If artOnlyPrice doesn't exist, calculate it
            if (!updatedRecord.artOnlyPrice) {
                updatedRecord.artOnlyPrice = calculateArtOnlyPrice(
                    updatedRecord.price, 
                    updatedRecord.framed || 'N', 
                    data.metadata.coefficients
                );
            }
            
            // Recalculate APPSI if needed
            if (updatedRecord.size > 0 && updatedRecord.artOnlyPrice > 0) {
                updatedRecord.appsi = calculateAPPSI(
                    updatedRecord.size, 
                    updatedRecord.artOnlyPrice, 
                    data.metadata.coefficients
                );
            }
        }
        
        // Remove imagePath – now using embedded Base64 images
        delete updatedRecord.imagePath;
        
        data.records[index] = updatedRecord;
        writeDatabase(data);
        
        console.log(`Updated record ${recordId}: artOnlyPrice=${updatedRecord.artOnlyPrice}, APPSI=${updatedRecord.appsi}`);
        res.json(updatedRecord);
    } catch (error) {
        console.error('Error updating record:', error);
        res.status(500).json({ error: error.message });
    }
});



// Updated recalculate APPSI endpoint - now uses artOnlyPrice method
app.post("/api/records/recalculate-appsi", (req, res) => {
  try {
    const data = readDatabase();
    const coefficients = data.metadata.coefficients;

    // Track results
    const results = {
      totalRecords: data.records.length,
      updatedRecords: 0,
      problematicRecords: [],
      addedArtOnlyPrice: 0
    };

    // Recalculate APPSI for all records using new method
    data.records.forEach(record => {
      // Ensure artOnlyPrice exists
      if (!record.artOnlyPrice) {
        record.artOnlyPrice = calculateArtOnlyPrice(
          record.price,
          record.framed || "N",
          coefficients
        );
        results.addedArtOnlyPrice++;
      }

      // Validate required fields for APPSI calculation
      if (
        !record.size ||
        !record.artOnlyPrice ||
        isNaN(record.size) ||
        isNaN(record.artOnlyPrice) ||
        record.size <= 0 ||
        record.artOnlyPrice <= 0
      ) {
        results.problematicRecords.push({
          recordId: record.id,
          issues: {
            size: record.size,
            artOnlyPrice: record.artOnlyPrice,
            hasValidSize:
              !!record.size && !isNaN(record.size) && record.size > 0,
            hasValidArtOnlyPrice:
              !!record.artOnlyPrice &&
              !isNaN(record.artOnlyPrice) &&
              record.artOnlyPrice > 0
          }
        });

        return; // Skip this record
      }

      // Calculate APPSI using artOnlyPrice (new method)
      const newAPPSI = calculateAPPSI(
        record.size,
        record.artOnlyPrice,
        coefficients
      );

      if (newAPPSI && newAPPSI > 0) {
        record.appsi = newAPPSI;
        results.updatedRecords++;
      }
    });

    // Write updated database
    writeDatabase(data);

    res.json({
      message: "Successfully recalculated APPSI using artOnlyPrice method",
      ...results
    });
  } catch (error) {
    console.error("Error in APPSI recalculation:", error);
    res
      .status(500)
      .json({ error: "Failed to recalculate APPSI", details: error.message });
  }
});

// Updated POST coefficients - recalculates all APPSI when coefficients change
app.post("/api/coefficients", (req, res) => {
  try {
    const data = readDatabase();

    // Update coefficients
    if (!data.metadata.coefficients) {
      data.metadata.coefficients = {};
    }

    // Update all coefficient fields
    Object.keys(req.body).forEach(key => {
      if (key !== "medium") {
        data.metadata.coefficients[key] = req.body[key];
      }
    });

    // Update medium multipliers if provided
    if (req.body.medium) {
      data.metadata.medium = { ...data.metadata.medium, ...req.body.medium };
    }

    data.metadata.lastUpdated = new Date().toISOString();

    // Recalculate all artOnlyPrice and APPSI values with new coefficients
    let recalculatedCount = 0;
    data.records.forEach(record => {
      // Recalculate artOnlyPrice with potentially new frame coefficients
      if (record.price && record.price > 0) {
        record.artOnlyPrice = calculateArtOnlyPrice(
          record.price,
          record.framed || "N",
          data.metadata.coefficients
        );
      }

      // Recalculate APPSI with new coefficients and artOnlyPrice
      if (
        record.size &&
        record.artOnlyPrice &&
        record.size > 0 &&
        record.artOnlyPrice > 0
      ) {
        record.appsi = calculateAPPSI(
          record.size,
          record.artOnlyPrice,
          data.metadata.coefficients
        );
        recalculatedCount++;
      }
    });

    writeDatabase(data);

    res.json({
      message: "Coefficients updated successfully",
      recalculatedRecords: recalculatedCount,
      coefficients: data.metadata.coefficients,
      medium: data.metadata.medium
    });
  } catch (error) {
    console.error("Error updating coefficients:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sizeyourprice", (req, res) => {
  try {
    const data = readDatabase();

    // Extract just the coefficients from the database
    const coefficients = {
      constant: data.metadata.coefficients.constant,
      exponent: data.metadata.coefficients.exponent
    };

    res.json(coefficients);
  } catch (error) {
    console.error("Error in Size Your Price endpoint:", error);
    res.status(500).json({
      error: {
        message:
          error.message ||
          "An error occurred retrieving the coefficients"
      }
    });
  }
});

// Add this constant at the top of server.js (after your other constants)
const VALID_FACTOR_NAMES = [
  "Line",
  "Shape",
  "Form",
  "Space",
  "Color/Hue",
  "Texture",
  "Tone/Value",
  "Saturation",
  "Composition",
  "Volume",
  "Balance",
  "Contrast",
  "Emphasis",
  "Movement",
  "Rhythm",
  "Variety",
  "Proportion",
  "Harmony",
  "Cohesiveness",
  "Pattern",
  "Brushwork",
  "Chiaroscuro",
  "Impasto",
  "Sfumato",
  "Glazing",
  "Scumbling",
  "Pointillism",
  "Wet-on-Wet",
  "Uniqueness",
  "Creativity",
  "Mood",
  "Viewer Engagement",
  "Emotional Resonance"
];

// REPLACE your entire /analyze-art endpoint with this:
app.post("/analyze-art", async (req, res) => {
  try {
    console.log("Received art analysis request");
    const {
      prompt,
      image,
      artTitle,
      artistName,
      subjectPhrase,
      temperature: requestedTemp
    } = req.body;

    const temperature =
      typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    if (!prompt || !image || (!OPENAI_API_KEY)) {
      return res
        .status(400)
        .json({ error: { message: "Missing prompt, image, or API key" } });
    }

    // Simple placeholder replacement - no hardcoded additions
    const finalPrompt = prompt
      .replace("{{TITLE}}", artTitle)
      .replace("{{ARTIST}}", artistName)
      .replace("{{SUBJECT}}", subjectPhrase);

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: finalPrompt },
          {
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${image}` }
          }
        ]
      }
    ];

    const systemContent =
      "You are an expert fine art analyst specializing in providing constructive feedback and refinement recommendations for artworks. Always respond with valid JSON only.";

    const analysisText = await callAI(
      messages,
      2000,
      systemContent,
      false,
      temperature
    );

    // Parse the JSON response
    let parsedAnalysis;
    try {
      let cleanedResponse = analysisText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      cleanedResponse = cleanedResponse.replace(/,(\s*[}\]])/g, "$1"); // Remove trailing commas
      cleanedResponse = cleanedResponse.replace(/\}\s*\]/g, "}]"); // Fix missing closing brackets
      parsedAnalysis = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.log("Raw AI response:", analysisText);
      return res.json({
        analysis: analysisText,
        isLegacyFormat: true
      });
    }

    // Validate the JSON structure
    if (
      !parsedAnalysis.overview ||
      !parsedAnalysis.strengths ||
      !parsedAnalysis.opportunities
    ) {
      console.error("Invalid JSON structure received from AI");
      return res.json({
        analysis: analysisText,
        isLegacyFormat: true
      });
    }

    // Validate recommendedStudy factors
    if (
      parsedAnalysis.recommendedStudy &&
      Array.isArray(parsedAnalysis.recommendedStudy)
    ) {
      // Check for exactly 3 factors (comment says 3, but code uses 2 – left as-is)
      if (parsedAnalysis.recommendedStudy.length !== 2) {
        console.warn(
          `Expected 3 recommended study factors, got ${parsedAnalysis.recommendedStudy.length}`
        );
      }

      // Validate factor names against the 33 approved list
      const invalidFactors = [];
      parsedAnalysis.recommendedStudy.forEach(study => {
        if (!VALID_FACTOR_NAMES.includes(study.factor)) {
          invalidFactors.push(study.factor);
        }
      });

      if (invalidFactors.length > 0) {
        console.error(
          `Invalid factor names detected: ${invalidFactors.join(", ")}`
        );
        console.error(
          "These factors are not in the approved 33 Essential Factors list"
        );
        return res.status(500).json({
          error: {
            message: `AI used invalid factor names: ${invalidFactors.join(
              ", "
            )}. Please try again.`
          }
        });
      }
    } else {
      console.warn("Missing or invalid recommendedStudy array");
      parsedAnalysis.recommendedStudy = [];
    }

    const finalResponse = {
      title: "Analysis: 33 Essential Factors",
      artTitle: artTitle,
      artistName: artistName,
      subjectPhrase: subjectPhrase,
      overview: parsedAnalysis.overview,
      strengths: parsedAnalysis.strengths,
      opportunities: parsedAnalysis.opportunities,
      recommendedStudy: parsedAnalysis.recommendedStudy || [],
      timestamp: new Date().toISOString()
    };

    console.log("Sending structured art analysis response to client");
    res.json(finalResponse);
  } catch (error) {
    console.error("Error in /analyze-art:", error.message);
    const errMsg =
      error.response?.data?.error?.message || error.message || "Unknown error";
    res.status(500).json({ error: { message: errMsg } });
  }
});




function formatAIAnalysisForReport(aiResponse) {
  if (!aiResponse || typeof aiResponse !== 'string') {
    console.warn("No AI response to format");
    return "Analysis not available";
  }

  // Try to extract JSON if present
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
  } catch (e) {
    console.log("AI response is not JSON, returning as plain text");
  }

  // If not JSON, return the text as-is
  return aiResponse.trim();
}

app.post("/api/valuation", async (req, res) => {
  try {
    console.log("Starting valuation process");

    const {
      smi,
      ri,
      cli,
      size,
      targetedRI,
      subjectImageBase64,
      media,
      title,
      artist,
      subjectDescription,
      height,
      width,
      temperature: requestedTemp
    } = req.body;

    // Use different temperatures for different purposes
    const smiTemperature = typeof requestedTemp === "number" ? requestedTemp : 0;
    const narrativeTemperature = 0.5; // Higher temp for narrative generation

    console.log("Valuation inputs:", {
      smi,
      ri,
      cli,
      size,
      targetedRI: Array.isArray(targetedRI) ? targetedRI : "Not an array",
      hasSubjectImage: !!subjectImageBase64,
      media,
      title,
      artist,
      subjectDescription,
      height,
      width
    });

    const db = readDatabase();
    const allRecords = db.records || [];
    const coefficients = db.metadata.coefficients;

    if (
      !smi ||
      !ri ||
      !cli ||
      !size ||
      !targetedRI ||
      !Array.isArray(targetedRI) ||
      !subjectImageBase64 ||
      !height ||
      !width
    ) {
      return res
        .status(400)
        .json({ error: "Missing required valuation inputs." });
    }

    // Step 1: Generate AI analysis
    let aiAnalysis = "";
    try {
      const promptPath = path.join(
        __dirname,
        "public",
        "prompts",
        "VALUATION_DESCRIPTION.txt"
      );
      const prompt = fs.readFileSync(promptPath, "utf8").trim();
      if (prompt.length < 50) {
        throw new Error("Prompt for ART_ANALYSIS.txt not found or too short");
      }

const textContent = subjectDescription
        ? `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}\nArtist's subject description: "${subjectDescription}"`
        : `Title: "${title}"\nArtist: "${artist}"\nMedium: ${media}`;



const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: textContent
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${subjectImageBase64}`
              }
            }
          ]
        }
      ];



      aiAnalysis = await callAI(
        messages,
        300,
        prompt,
        false,
        narrativeTemperature  // Use higher temp for narrative
      );
      console.log("Analysis completed successfully");
    } catch (error) {
      console.error("Analysis failed:", error.message);
      return res.status(500).json({
        error: "Analysis failed",
        details: error.response?.data?.error?.message || error.message
      });
    }

    // Step 2: Filter valid comps
    const comps = allRecords.filter(r => {
      const isValid =
        r.ri !== undefined &&
        targetedRI.includes(Number(r.ri)) &&
        typeof r.smi === "number" &&
        typeof r.cli === "number" &&
        typeof r.appsi === "number" &&
        r.thumbnailBase64 &&
        r.artistName &&
        r.title &&
        r.height &&
        r.width &&
        r.medium &&
        r.price;
      return isValid;
    });

    console.log(`Found ${comps.length} valid comparison records`);

    if (comps.length === 0) {
      return res.status(400).json({
        error: "No valid comparison records found for the specified criteria.",
        details: { targetedRI, totalRecords: allRecords.length }
      });
    }

    // Step 3: Z-score stats
    const meanStd = (arr, key) => {
      const values = arr.map(r => r[key]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(
        values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length
      );
      return { mean, std };
    };

    const z = (v, mean, std) => (std ? (v - mean) / std : 0);

    const stats = {
      smi: meanStd(comps, "smi"),
      cli: meanStd(comps, "cli")
    };

const zSubject = {
  smi: z(smi, stats.smi.mean, stats.smi.std),
  cli: z(cli, stats.cli.mean, stats.cli.std)
};

	const weights = { smi: 0.50, cli: 0.50 };

    const DISTANCE_THRESHOLD = 999; // Temporarily allow ALL comps through for testing

    // Step 4: Calculate scalar distances and filter by threshold


const enriched = comps
  .map(r => {
    const zd = {
      smi: z(r.smi, stats.smi.mean, stats.smi.std),
      cli: z(r.cli, stats.cli.mean, stats.cli.std)
    };
    const dist = Math.sqrt(
      weights.smi * Math.pow(zd.smi - zSubject.smi, 2) +
        weights.cli * Math.pow(zd.cli - zSubject.cli, 2)
    );
    return { ...r, scalarDistance: dist };
  })


      .filter(r => r.scalarDistance <= DISTANCE_THRESHOLD)
      .sort((a, b) => a.scalarDistance - b.scalarDistance);

    // Log filtering results
    console.log(`After distance filtering (≤${DISTANCE_THRESHOLD}): ${enriched.length} comps remain`);

    // Add detailed logging for top 20 comps
    console.log("\n=== TOP 20 COMPS BY DISTANCE ===");
    enriched.slice(0, 20).forEach((comp, idx) => {
      console.log(`#${idx + 1}: Distance=${comp.scalarDistance.toFixed(3)}, SMI=${comp.smi}, CLI=${comp.cli}, RI=${comp.ri}, Artist="${comp.artistName}", Title="${comp.title}"`);
    });
    console.log("================================\n");

    // Check if we have enough comps after filtering
    if (enriched.length < 5) {
      console.warn(
        `⚠️ Only ${enriched.length} comps within distance threshold. Consider expanding RI range or threshold.`
      );
      // Continue anyway - use whatever we have
    }

    // Step 5: Calculate predictedPPSI for subject
    const subject = {
      smi,
      cli,
      medium: media,
      frame: 0,
      SSI: size,
      height,
      width
    };

    const lssi = Math.log(subject.SSI);
    const predictedPPSI =
      coefficients.constant * Math.pow(lssi, coefficients.exponent);

    // Step 6: Select top 10 comps with enhanced data and calculate adjustments
    const topComps = enriched.slice(0, 10).map(r => ({
      id: r.id,
      appsi: r.appsi,
      smi: r.smi,
      cli: r.cli,
      ri: r.ri,
      medium: r.medium,
      artistName: r.artistName,
      title: r.title,
      height: r.height,
      width: r.width,
      price: r.price,
      thumbnailBase64: r.thumbnailBase64,
      scalarDistance: r.scalarDistance  // Include distance for transparency
    }));

    // Calculate sizeAdjFactor
    subject.predictAt200 =
      coefficients.constant * Math.pow(Math.log(200), coefficients.exponent);
    subject.predictAtSubj = predictedPPSI;
    subject.ratio = subject.predictAtSubj / subject.predictAt200;
    subject.sizeAdjFactor = subject.ratio - 1;

    console.log(
      "Sending enhanced valuation response with analysis and complete comparable data"
    );

    res.json({
      topComps,
      coefficients,
      medium: db.metadata.medium,
      aiAnalysis: formatAIAnalysisForReport(aiAnalysis)
    });
  } catch (error) {
    console.error("Valuation request failed:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Valuation processing failed",
      details: error.response?.data?.error?.message || error.message
    });
  }
});






app.get("/api/debug-export", (req, res) => {
  try {
    const data = readDatabase();
    const exportSubset = data.records.map(r => ({
      ID: r.id,
      "Artist Name": r.artistName,
      Title: r.title,
      SMI: r.SMI,
      RI: r.RI,
      CLI: r.CLI,
      APPSI: r.APPSI,
      "Price ($)": r["Price ($)"]
    }));
    res.json(exportSubset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/compare-subject-comp", async (req, res) => {
  try {
    const {
      subject,
      comp,
      temperature: requestedTemp
    } = req.body;

    const temperature =
      typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    console.log(`Starting comparison for comp ID ${comp.recordId}`);

    if (!subject || !comp) {
      return res
        .status(400)
        .json({ error: { message: "Missing subject or comp data" } });
    }

    // Check for image data with detailed logging
    if (!subject.imageBase64) {
      console.error("Missing subject imageBase64");
      return res
        .status(400)
        .json({ error: { message: "Subject must include imageBase64" } });
    }

    if (!comp.imageBase64) {
      console.error(`Missing comp imageBase64 for ID ${comp.recordId}`);
      return res
        .status(400)
        .json({ error: { message: "Comp must include imageBase64" } });
    }

    if (!OPENAI_API_KEY) {
      return res
        .status(500)
        .json({ error: { message: "Missing API Key" } });
    }

    console.log(`Comparing Subject to Comp ID ${comp.recordId}`);

    // Check image data format
    if (!subject.imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
      console.error("Subject image data is not valid base64");
      return res.status(400).json({
        error: { message: "Subject image data is not valid base64" }
      });
    }

    if (!comp.imageBase64.match(/^[A-Za-z0-9+/=]+$/)) {
      console.error(
        `Comp ID ${comp.recordId} image data is not valid base64`
      );
      return res.status(400).json({
        error: { message: "Comp image data is not valid base64" }
      });
    }

    // Build the prompt for ChatGPT
    const comparisonPrompt = `
You are an expert fine art evaluator.

Compare the following two artworks (Subject and Comparable) based on six aesthetic criteria.

For each criterion, answer Yes if the Comparable artwork is *Superior* to the Subject; otherwise, answer No.

Criteria (Answer Yes or No for each):
1. Subject Matter Appeal
2. Design and Composition Quality
3. Deployment of Advanced Techniques
4. Demonstration of Core Elements of Art
5. Visual Engagement
6. Emotional Resonance

Respond STRICTLY in the following format:

Criterion 1: Yes or No
Criterion 2: Yes or No
Criterion 3: Yes or No
Criterion 4: Yes or No
Criterion 5: Yes or No
Criterion 6: Yes or No
`;

    // Send request to AI
    console.log("Sending request to AI for comparison");

    const messages = [
      {
        role: "user",
        content: [
          { type: "text", text: comparisonPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${subject.imageBase64}`
            }
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${comp.imageBase64}`
            }
          }
        ]
      }
    ];

    const systemContent =
      "You are a strict fine art evaluator following exact instructions.";

    const chatReply = await callAI(
      messages,
      200,
      systemContent,
      false,
      temperature
    );

    console.log(
      `Received comparison reply for Comp ID ${comp.recordId}:`,
      chatReply.substring(0, 200)
    );

    // Parse results
    const yesNoResults = chatReply.match(
      /Criterion\s*\d+:\s*(Yes|No)/gi
    );

    if (!yesNoResults || yesNoResults.length !== 6) {
      console.error("Invalid format received from AI comparison");
      return res.status(500).json({
        error: { message: "Invalid response format from AI" }
      });
    }

    // Define criterion weights
    const criteriaWeights = [0.2, 0.2, 0.15, 0.1, 0.15, 0.2];

    let totalScore = 0;

    yesNoResults.forEach((line, idx) => {
      const answer = line.split(":")[1].trim().toLowerCase();
      if (answer === "yes") {
        totalScore += criteriaWeights[idx];
      }
    });

    // Determine final result
    const finalResult = totalScore > 0.5 ? "Superior" : "Inferior";
    console.log(
      `Comparison result for Comp ID ${comp.recordId}: ${finalResult} (score: ${totalScore})`
    );

    res.json({
      totalScore: Math.round(totalScore * 100), // Return as percentage
      finalResult: finalResult
    });
  } catch (error) {
    console.error(
      "Error in /api/compare-subject-comp:",
      error.message
    );
    let errorDetails = "Unknown error";

    if (error.response) {
      errorDetails = JSON.stringify({
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.message) {
      errorDetails = error.message;
    }

    res.status(500).json({ error: { message: errorDetails } });
  }
});



// ✅ NEW ENDPOINT: Generate Narrative Explanation
app.post("/api/generate-narrative", async (req, res) => {
  try {
    const {
      superiors,
      inferiors,
      comps,
      ruleUsed,
      smvppsi,
      temperature: requestedTemp
    } = req.body;

    if (
      !comps ||
      !Array.isArray(comps) ||
      comps.length === 0 ||
      !ruleUsed ||
      typeof smvppsi !== "number"
    ) {
      return res.status(400).json({
        error: "Missing required fields: comps[], ruleUsed, smvppsi (number)"
      });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing API Key" });
    }

    const temperature =
      typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    // Format input summary for GPT
    const compLines = comps
      .map(c => {
        return `RecordID ${c.recordId}: SMI=${c.smi}, RI=${c.ri}, CLI=${c.cli}, APPSI=${c.appsi.toFixed(
          2
        )}, Distance=${c.scalarDistance?.toFixed(4) ?? "NA"}, Label=${c.label}`;
      })
      .join("\n");

    let conditionIntro = "";
    if (ruleUsed === "All Inferior") {
      conditionIntro =
        "Since all selected comparable artworks were deemed inferior to the subject,";
    } else if (ruleUsed === "All Superior") {
      conditionIntro =
        "Since all selected comparable artworks were deemed superior to the subject,";
    } else {
      conditionIntro =
        "Because the selected comparables included a mix of both superior and inferior artworks,";
    }

    const prompt = `
You are a fine art valuation assistant. Based on the visual classification and pricing logic, generate a professional, narrative paragraph titled "Analysis of Comparable Artworks".

Use this information:

${conditionIntro}
SMVPPSI: ${smvppsi.toFixed(2)}

Comparable Records:
${compLines}

Write one professional paragraph that:
- Describes how the condition of the selected comparables affected the valuation.
- Refers to the comps by RecordID (not artist or title).
- Explains how SMVPPSI was derived from APPSI.
- Uses a straightforward, professional style of a fine art appraiser.
- Do NOT include any headings — return just the paragraph text.
`;

    const messages = [{ role: "user", content: prompt }];

    const systemContent = "You are a fine art valuation assistant.";

    const paragraph = await callAI(
      messages,
      400,
      systemContent,
      false,
      temperature
    );

    res.json({ narrative: paragraph.trim() });
  } catch (error) {
    console.error("Narrative generation error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate narrative paragraph"
    });
  }
});

app.get("/api/debug-database", (req, res) => {
  try {
    // Read the database
    const data = readDatabase();

    // Basic diagnostics
    const totalRecords = data.records.length;
    const sampleRecord = totalRecords > 0 ? data.records[0] : null;
    const fieldNames = sampleRecord ? Object.keys(sampleRecord) : [];

    // Get path to database file
    const dbPath = DB_PATH;

    res.json({
      databasePath: dbPath,
      databaseExists: fs.existsSync(DB_PATH),
      totalRecords: totalRecords,
      sampleFieldNames: fieldNames
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// Add this endpoint to server.js for record debugging
app.get("/api/debug-record/:id", (req, res) => {
  try {
    const recordId = parseInt(req.params.id);
    const data = readDatabase();
    const record = data.records.find(r => r.id === recordId);

    if (!record) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json({
      id: record.id,
      isActive: record.isActive,
      metrics: {
        smi: record.smi,
        ri: record.ri,
        cli: record.cli,
        appsi: record.appsi
      },
      types: {
        smi_type: typeof record.smi,
        ri_type: typeof record.ri,
        cli_type: typeof record.cli,
        appsi_type: typeof record.appsi
      },
      valid: {
        smi_valid:
          record.smi !== undefined &&
          record.smi !== null &&
          !isNaN(record.smi),
        ri_valid:
          record.ri !== undefined && record.ri !== null && !isNaN(record.ri),
        cli_valid:
          record.cli !== undefined &&
          record.cli !== null &&
          !isNaN(record.cli),
        appsi_valid:
          record.appsi !== undefined &&
          record.appsi !== null &&
          !isNaN(record.appsi)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ DEBUG: Scan database for legacy image fields
app.get("/api/debug-scan-images", (req, res) => {
  try {
    const data = readDatabase();
    const flagged = [];

    data.records.forEach(record => {
      const findings = {};
      if ("imagePath" in record) findings.imagePath = record.imagePath;
      if ("imageFile" in record) findings.imageFile = record.imageFile;
      if (
        record.imageBase64 &&
        typeof record.imageBase64 === "string" &&
        record.imageBase64.includes("http")
      ) {
        findings.imageBase64 = record.imageBase64;
      }
      if (Object.keys(findings).length > 0) {
        flagged.push({
          recordId: record.id,
          findings
        });
      }
    });

    res.json({
      totalRecords: data.records.length,
      flaggedCount: flagged.length,
      flagged
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/debug-clean-images", (req, res) => {
  try {
    const data = readDatabase();
    let cleanedCount = 0;
    let fixedBase64Count = 0;

    data.records.forEach(record => {
      // Remove legacy fields
      if ("imagePath" in record) {
        delete record.imagePath;
        cleanedCount++;
      }
      if ("imageFile" in record) {
        delete record.imageFile;
        cleanedCount++;
      }

      // Fix raw base64 (no prefix)
      if (
        record.imageBase64 &&
        typeof record.imageBase64 === "string" &&
        !record.imageBase64.startsWith("data:image")
      ) {
        record.imageBase64 = `data:image/jpeg;base64,${record.imageBase64}`;
        fixedBase64Count++;
      }
    });

    writeDatabase(data);

    res.json({
      success: true,
      cleanedLegacyFields: cleanedCount,
      fixedRawBase64: fixedBase64Count,
      message: `Cleaned ${cleanedCount} legacy fields and fixed ${fixedBase64Count} raw base64 images.`
    });
  } catch (error) {
    console.error("Cleanup error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/records/calculate-lssi", (req, res) => {
  try {
    const data = readDatabase();

    // Track records updated
    let recordsUpdated = 0;
    let recordsWithErrors = 0;

    // Update LSSI for all records
    data.records.forEach(record => {
      try {
        // Skip records without size
        if (!record.size || isNaN(record.size) || record.size <= 0) {
          recordsWithErrors++;
          return;
        }

        // Calculate or update LSSI
        record.lssi = Math.log(record.size);
        recordsUpdated++;
      } catch (error) {
        console.error(
          `Error calculating LSSI for record ${record.id}:`,
          error
        );
        recordsWithErrors++;
      }
    });

    // Write updated database
    writeDatabase(data);

    res.json({
      message: "Successfully calculated LSSI for records",
      totalRecords: data.records.length,
      recordsUpdated: recordsUpdated,
      recordsWithErrors: recordsWithErrors
    });
  } catch (error) {
    console.error("Error in LSSI calculation endpoint:", error);
    res.status(500).json({
      error: "Failed to calculate LSSI",
      details: error.message
    });
  }
});

app.get("/download/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join("/mnt/data", filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found.");
  }

  // ✅ Add these headers for better large file handling:
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // ✅ Use streaming for better performance:
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);

  fileStream.on("error", err => {
    console.error("❌ Download failed:", err);
    res.status(500).send("Error downloading file.");
  });
});

app.get("/api/metadata", async (req, res) => {
  try {
    // Use the existing DB_PATH constant
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

    // Debug log to verify structure
    console.log("Database metadata structure:", {
      hasMetadata: !!db.metadata,
      hasCoefficients: !!db.metadata?.coefficients,
      lastUpdated: db.metadata?.lastUpdated
    });

    // Return coefficients or empty object if none exists
    res.json(db.metadata?.coefficients || {});
  } catch (error) {
    console.error("Metadata endpoint error:", {
      error: error.message,
      dbPath: DB_PATH,
      fileExists: fs.existsSync(DB_PATH),
      fileAccessible: fs.accessSync ? "Checking..." : "Cannot check"
    });

    res.status(500).json({
      error: "Failed to load metadata",
      // Only show details in development
      details:
        process.env.NODE_ENV === "development"
          ? {
              message: error.message,
              dbPath: DB_PATH
            }
          : null
    });
  }
});

app.post("/api/metadata/update", async (req, res) => {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, "utf8"));

    // Initialize metadata if it doesn't exist
    db.metadata = db.metadata || {};
    db.metadata.coefficients = db.metadata.coefficients || {};

    // Merge updates with existing values
    const updatedCoefficients = {
      ...db.metadata.coefficients, // Keep existing values
      ...req.body, // Apply new values
      lastUpdated: new Date().toISOString() // Add timestamp
    };

    // Special handling for medium multipliers
    if (req.body.medium) {
      updatedCoefficients.medium = {
        ...(db.metadata.coefficients.medium || {}), // Keep existing medium values
        ...req.body.medium // Apply medium updates
      };
    }

    // Save the merged data
    db.metadata.coefficients = updatedCoefficients;
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

    res.json({
      success: true,
      updated: updatedCoefficients
    });
  } catch (error) {
    console.error("Update failed:", error);
    res.status(500).json({
      error: "Update failed",
      details:
        process.env.NODE_ENV === "development" ? error.message : null
    });
  }
});

app.get("/api/health", (req, res) => {
  try {
    const stats = fs.statSync(DB_PATH);
    res.json({
      status: "healthy",
      db: {
        path: DB_PATH,
        exists: true,
        size: stats.size,
        lastModified: stats.mtime
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      dbPath: DB_PATH
    });
  }
});

// Add this endpoint to your server.js file

app.post("/api/batch-calculate-smi", async (req, res) => {
  try {
    console.log("Starting batch SMI calculation...");

    const { temperature: requestedTemp } = req.body || {};
    const temperature =
      typeof requestedTemp === "number" ? requestedTemp : DEFAULT_TEMPERATURE;

    const imagesDir = "/mnt/data/images";
    const promptPath = path.join(
      __dirname,
      "public",
      "prompts",
      "SMI_prompt.txt"
    );

    // Check if directories exist
    if (!fs.existsSync(imagesDir)) {
      return res
        .status(400)
        .json({ error: `Images directory not found: ${imagesDir}` });
    }

    if (!fs.existsSync(promptPath)) {
      return res
        .status(400)
        .json({ error: `SMI prompt file not found: ${promptPath}` });
    }

    // Load the SMI prompt
    const prompt = fs.readFileSync(promptPath, "utf8").trim();
    if (prompt.length < 100) {
      return res.status(400).json({
        error: "SMI prompt file appears to be empty or too short"
      });
    }

    // Get all image files
    const imageFiles = fs
      .readdirSync(imagesDir)
      .filter(file => file.match(/^\d+\.(jpg|jpeg|png)$/i))
      .sort((a, b) => {
        const aNum = parseInt(a.split(".")[0]);
        const bNum = parseInt(b.split(".")[0]);
        return aNum - bNum;
      });

    console.log(`Found ${imageFiles.length} image files to process`);

    if (imageFiles.length === 0) {
      return res.status(400).json({
        error:
          "No valid image files found (expecting format: recordID.jpg)"
      });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;

    // Process each image
    for (const filename of imageFiles) {
      try {
        const recordId = filename.split(".")[0];
        console.log(
          `Processing record ${recordId} (${processedCount + 1}/${
            imageFiles.length
          })`
        );

        // Read and convert image to base64
        const imagePath = path.join(imagesDir, filename);
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        // Prepare the prompt with minimal info since we don't have artist/title
        const finalPrompt = `Title: "Record ${recordId}"\nArtist: "Unknown"\n\n${prompt}`;

        // Create messages for AI
        const messages = [
          {
            role: "user",
            content: [
              { type: "text", text: finalPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ];

        const systemContent =
          "You are an expert fine art analyst specializing in evaluating artistic skill mastery. Provide your response in the exact JSON format specified.";

        // Call AI for analysis
        const aiResponse = await callAI(
          messages,
          2000,
          systemContent,
          true,
          temperature
        );

        // Validate response
        if (
          !aiResponse ||
          !aiResponse.category_scores ||
          !aiResponse.final_smi
        ) {
          throw new Error("Invalid AI response format");
        }

        // Validate category scores
        const requiredCategories = [
          "composition",
          "color",
          "technical",
          "originality",
          "emotional"
        ];
        for (const category of requiredCategories) {
          const score = aiResponse.category_scores[category];
          if (
            typeof score !== "number" ||
            isNaN(score) ||
            score < 1.0 ||
            score > 5.0
          ) {
            throw new Error(`Invalid ${category} score: ${score}`);
          }
          // Check 0.5 increment requirement
          if ((score * 2) % 1 !== 0) {
            throw new Error(
              `${category} score ${score} is not in 0.5 increments`
            );
          }
        }

        // Recalculate SMI using backend logic for consistency
        const calculatedSMI =
          aiResponse.category_scores.composition * 0.2 +
          aiResponse.category_scores.color * 0.2 +
          aiResponse.category_scores.technical * 0.25 +
          aiResponse.category_scores.originality * 0.2 +
          aiResponse.category_scores.emotional * 0.15;

        // Round up to nearest 0.25
        const roundedSMI = roundSMIUp(calculatedSMI);
        const finalSMI = roundedSMI.toFixed(2);

        results.push({
          recordId: parseInt(recordId),
          smi: finalSMI,
          composition: aiResponse.category_scores.composition,
          color: aiResponse.category_scores.color,
          technical: aiResponse.category_scores.technical,
          originality: aiResponse.category_scores.originality,
          emotional: aiResponse.category_scores.emotional
        });

        processedCount++;
        console.log(`✅ Record ${recordId}: SMI = ${finalSMI}`);

        // Add small delay to avoid overwhelming the AI API
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const recordId = filename.split(".")[0];
        console.error(
          `❌ Error processing record ${recordId}:`,
          error.message
        );
        errors.push({
          recordId: recordId,
          error: error.message,
          filename: filename
        });
      }
    }

    // Generate CSV content
    const csvHeader =
      "RecordID,SMI,Composition,Color,Technical,Originality,Emotional\n";
    const csvRows = results
      .map(
        r =>
          `${r.recordId},${r.smi},${r.composition},${r.color},${r.technical},${r.originality},${r.emotional}`
      )
      .join("\n");
    const csvContent = csvHeader + csvRows;

    // Save CSV file
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const csvFilename = `batch_smi_results_${timestamp}.csv`;
    const csvPath = path.join("/mnt/data", csvFilename);
    fs.writeFileSync(csvPath, csvContent);

    console.log(`✅ Batch processing completed!`);
    console.log(`📊 Successfully processed: ${results.length}`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`💾 Results saved to: ${csvFilename}`);

    res.json({
      success: true,
      message: "Batch SMI calculation completed",
      summary: {
        totalFiles: imageFiles.length,
        successfullyProcessed: results.length,
        errors: errors.length,
        csvFile: csvFilename,
        csvDownloadUrl: `/download/${csvFilename}`
      },
      results: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error("❌ Batch processing failed:", error);
    res.status(500).json({
      error: "Batch processing failed",
      details: error.message
    });
  }
});

// Helper function to trigger batch processing (optional - for testing)
app.get("/api/start-batch-smi", (req, res) => {
  res.json({
    message:
      "Send POST request to /api/batch-calculate-smi to start batch processing",
    instructions:
      "This will process all images in the images directory and generate a CSV file"
  });
});

const DATABASE_FILE_PATH = "/mnt/data/art_database.json"; // Common mount path

function migrateAddArtOnlyPrice(databaseData) {
  console.log("Starting migration: Adding artOnlyPrice field...");

  // Get frame coefficients from metadata
  const frameConstant =
    databaseData.metadata.coefficients["frame-constant"];
  const frameExponent =
    databaseData.metadata.coefficients["frame-exponent"];

  console.log(
    `Using frame coefficients: constant=${frameConstant}, exponent=${frameExponent}`
  );

  let processed = 0;
  let added = 0;
  let skipped = 0;

  // Process each record
  databaseData.records.forEach(record => {
    processed++;

    // Skip if artOnlyPrice already exists
    if (record.hasOwnProperty("artOnlyPrice")) {
      skipped++;
      console.log(
        `Record ${record.id}: Already has artOnlyPrice (${record.artOnlyPrice}), skipping`
      );
      return;
    }

    // Calculate artOnlyPrice
    const artOnlyPrice = calculateArtOnlyPrice(
      record.price,
      record.framed,
      databaseData.metadata.coefficients
    );

    // Add the new field
    record.artOnlyPrice = Math.round(artOnlyPrice * 100) / 100; // Round to 2 decimal places
    added++;

    // Log some examples
    if (processed <= 5) {
      console.log(
        `Record ${record.id}: price=${record.price}, framed=${record.framed}, artOnlyPrice=${record.artOnlyPrice}`
      );
    }
  });

  // Update metadata to record migration
  databaseData.metadata.lastUpdated = new Date().toISOString();
  databaseData.metadata.migrations =
    databaseData.metadata.migrations || [];
  databaseData.metadata.migrations.push({
    name: "add_artOnlyPrice",
    date: new Date().toISOString(),
    recordsProcessed: processed,
    recordsUpdated: added,
    recordsSkipped: skipped
  });

  console.log("Migration completed:");
  console.log(`- Records processed: ${processed}`);
  console.log(`- Records updated: ${added}`);
  console.log(`- Records skipped: ${skipped}`);

  return databaseData;
}

// API endpoint to run migration (add to your Express routes)
app.post("/api/migrate/add-artOnlyPrice", (req, res) => {
  try {
    console.log("🚀 Starting artOnlyPrice migration via API...");

    // 1. Read the database file
    console.log(`📖 Reading database from: ${DATABASE_FILE_PATH}`);
    const rawData = fs.readFileSync(DATABASE_FILE_PATH, "utf8");
    const databaseData = JSON.parse(rawData);

    console.log(
      `✅ Database loaded: ${databaseData.records.length} records found`
    );

    // 2. Create automatic backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = DATABASE_FILE_PATH.replace(
      ".json",
      `_backup_${timestamp}.json`
    );
    fs.writeFileSync(backupPath, rawData);
    console.log(`💾 Backup created: ${backupPath}`);

    // 3. Run migration
    const updatedDatabase = migrateAddArtOnlyPrice(databaseData);

    // 4. Save updated database
    const updatedJson = JSON.stringify(updatedDatabase, null, 2);
    fs.writeFileSync(DATABASE_FILE_PATH, updatedJson);

    console.log("✅ MIGRATION COMPLETED SUCCESSFULLY!");

    // 5. Verification
    let withArtOnly = 0;
    let framedCount = 0;

    updatedDatabase.records.forEach(record => {
      if (record.hasOwnProperty("artOnlyPrice")) {
        withArtOnly++;
        if (record.framed === "Y") framedCount++;
      }
    });

    const result = {
      success: true,
      message: "Migration completed successfully",
      stats: {
        totalRecords: updatedDatabase.records.length,
        recordsWithArtOnlyPrice: withArtOnly,
        framedPieces: framedCount,
        unframedPieces: withArtOnly - framedCount
      },
      backupFile: backupPath
    };

    console.log("Migration stats:", result.stats);
    res.json(result);
  } catch (error) {
    console.error("❌ MIGRATION FAILED:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: "Migration failed - database unchanged"
    });
  }
});

// Optional: CLI script if you want to run it directly on server
function runMigrationCLI() {
  if (process.argv.includes("--migrate-artOnlyPrice")) {
    console.log("🎨 Running artOnlyPrice migration...");

    try {
      const rawData = fs.readFileSync(DATABASE_FILE_PATH, "utf8");
      const databaseData = JSON.parse(rawData);

      // Create backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupPath = DATABASE_FILE_PATH.replace(
        ".json",
        `_backup_${timestamp}.json`
      );
      fs.writeFileSync(backupPath, rawData);

      // Run migration
      const updatedDatabase = migrateAddArtOnlyPrice(databaseData);

      // Save
      fs.writeFileSync(
        DATABASE_FILE_PATH,
        JSON.stringify(updatedDatabase, null, 2)
      );

      console.log("✅ Migration completed via CLI");
      process.exit(0);
    } catch (error) {
      console.error("❌ CLI Migration failed:", error);
      process.exit(1);
    }
  }
}

// Run CLI migration if called with flag
runMigrationCLI();

module.exports = { migrateAddArtOnlyPrice, calculateArtOnlyPrice };

// Serve static files from the "public" folder
app.use(express.static("public"));

// ====================
// START THE SERVER
// ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
