/**
 * Derma Aline Aesthetics Skin Clinic - Master Treatment & Pricing Catalogue
 * Complete 55 treatments across 7 clinical categories.
 * All prices in Indian Rupees (INR - ₹).
 */

export const CLINIC_WHATSAPP_NUMBER = "918700751880";
export const CLINIC_PHONE_DISPLAY = "+91 87007 51880";

export const TREATMENT_CATEGORIES = [
  { id: "all", name: "All Treatments", shortName: "All" },
  { id: "hair-scalp", name: "Hair & Scalp Treatments", shortName: "Hair & Scalp", count: 16 },
  { id: "chemical-peels", name: "Chemical Peels", shortName: "Chemical Peels", count: 9 },
  { id: "injectables-antiaging", name: "Injectables, Drips & Anti-Aging / Lifting", shortName: "Injectables & Anti-Aging", count: 6 },
  { id: "microneedling-mnrf", name: "Microneedling & MNRF", shortName: "Microneedling & MNRF", count: 5 },
  { id: "laser-lesion", name: "Laser & Lesion / Growth Removal", shortName: "Laser & Lesion Removal", count: 6 },
  { id: "pigmentation-acne", name: "Pigmentation, Acne & Skin Brightening", shortName: "Pigmentation & Brightening", count: 7 },
  { id: "semipermanent-hydra", name: "Semi-Permanent Makeup & HydraFacial", shortName: "Semi-Permanent & HydraFacial", count: 6 }
];

export const TREATMENTS_DATA = [
  // ==========================================
  // CATEGORY 1: Hair & Scalp Treatments (16 items)
  // ==========================================
  // PRP & GFC Therapies
  {
    id: "hair-gfc-prp",
    name: "Hair GFC + PRP",
    price: "₹7,000",
    priceValue: 7000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "PRP & GFC Therapies",
    pricingNote: "Per Session",
    description: "Synergistic autologous growth factor concentrate (GFC) combined with platelet-rich plasma therapy to support follicular rejuvenation and scalp vitality.",
    image: "/clinic-interior.webp"
  },
  {
    id: "hair-prp",
    name: "Hair PRP",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "PRP & GFC Therapies",
    pricingNote: "Per Session",
    description: "Concentrated platelet-rich plasma micro-infusion to nourish scalp microcirculation, revitalise miniaturised follicles, and support denser-looking hair.",
    image: "/clinic-interior.webp"
  },
  // Laser Hair Reduction: Facial & Neck
  {
    id: "lhr-full-face",
    name: "Full Face Laser Hair Reduction",
    displayName: "Full Face",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Facial & Neck",
    pricingNote: "Per Session",
    description: "Clinical-grade diode laser hair reduction specifically calibrated for fine and coarse facial hair, ensuring smooth, hair-free facial contours.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-upper-lips",
    name: "Upper Lips Laser Hair Reduction",
    displayName: "Upper Lips",
    price: "₹2,000",
    priceValue: 2000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Facial & Neck",
    pricingNote: "Per Session",
    description: "Precision laser targeting designed for the delicate perioral upper lip area to reduce persistent hair growth comfortably.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-chin",
    name: "Chin Laser Hair Reduction",
    displayName: "Chin",
    price: "₹1,500",
    priceValue: 1500,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Facial & Neck",
    pricingNote: "Per Session",
    description: "Focused diode laser pulses calibrated for coarse chin hair follicles often associated with hormonal sensitivity.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-sidelocks",
    name: "Sidelocks Laser Hair Reduction",
    displayName: "Sidelocks",
    price: "₹2,000",
    priceValue: 2000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Facial & Neck",
    pricingNote: "Per Session",
    description: "Clean aesthetic hairline refinement along the temporal sidelocks for symmetrical facial framing.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-forehead",
    name: "Forehead Laser Hair Reduction",
    displayName: "Forehead",
    price: "₹2,000",
    priceValue: 2000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Facial & Neck",
    pricingNote: "Per Session",
    description: "Controlled hairline definition and hair reduction across the upper forehead zone for a neat, polished appearance.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-neck",
    name: "Neck Laser Hair Reduction",
    displayName: "Neck",
    price: "₹2,000",
    priceValue: 2000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Facial & Neck",
    pricingNote: "Per Session",
    description: "Comprehensive front and side neck hair reduction to prevent razor irritation, folliculitis, and unwanted stubble.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-backnape",
    name: "Backnape Laser Hair Reduction",
    displayName: "Backnape",
    price: "₹3,000",
    priceValue: 3000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Facial & Neck",
    pricingNote: "Per Session",
    description: "Precision posterior neckline shaping and permanent hair reduction for a consistently sharp, groomed appearance.",
    image: "/Laser hair.webp"
  },
  // Laser Hair Reduction: Body & Targeted Areas
  {
    id: "lhr-stomach",
    name: "Stomach Laser Hair Reduction",
    displayName: "Stomach",
    price: "₹4,000",
    priceValue: 4000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Body & Targeted Areas",
    pricingNote: "Per Session",
    description: "Full abdominal coverage targeting central linea alba and wider stomach hair for silky, even skin texture.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-shine-area",
    name: "Shine Area Laser Hair Reduction",
    displayName: "Shine Area",
    price: "₹7,000",
    priceValue: 7000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Body & Targeted Areas",
    pricingNote: "Per Session",
    description: "Targeted clinical laser reduction for prominent aesthetic body areas, ensuring comprehensive hair clearance.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-full-legs",
    name: "Full Legs Laser Hair Reduction",
    displayName: "Full Legs",
    price: "₹10,000",
    priceValue: 10000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Body & Targeted Areas",
    pricingNote: "Per Session",
    description: "Complete lower and upper legs diode laser treatment providing lasting smoothness without recurring waxing or razor burn.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-bikini-area",
    name: "Bikini Area Laser Hair Reduction",
    displayName: "Bikini Area",
    price: "₹8,000",
    priceValue: 8000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Body & Targeted Areas",
    pricingNote: "Per Session",
    description: "Conducted in strict clinical privacy with integrated contact cooling to ensure optimal comfort and hygiene in sensitive zones.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-full-body",
    name: "Full Body Laser Hair Reduction",
    displayName: "Full Body",
    price: "₹30,000",
    priceValue: 30000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Body & Targeted Areas",
    pricingNote: "Per Session",
    description: "Our premier head-to-toe permanent hair reduction protocol covering arms, legs, back, chest, abdomen, underarms, and face.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-under-arms",
    name: "Under Arms Laser Hair Reduction",
    displayName: "Under Arms",
    price: "₹6,000",
    priceValue: 6000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Body & Targeted Areas",
    pricingNote: "Per Session",
    description: "Rapid, hygienic axillary hair removal that eliminates recurring ingrown hairs and darkening from regular shaving.",
    image: "/Laser hair.webp"
  },
  {
    id: "lhr-chest",
    name: "Chest Laser Hair Reduction",
    displayName: "Chest",
    price: "₹4,000",
    priceValue: 4000,
    categoryId: "hair-scalp",
    categoryName: "Hair & Scalp Treatments",
    subcategory: "Laser Hair Reduction — Body & Targeted Areas",
    pricingNote: "Per Session",
    description: "Comprehensive pectoral area coverage with customizable hair thinning or complete clearance based on personal aesthetic goals.",
    image: "/Laser hair.webp"
  },

  // ==========================================
  // CATEGORY 2: Chemical Peels (9 items)
  // ==========================================
  // Targeted & Medical Peels
  {
    id: "peel-phenol",
    name: "Phenol Peel",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Targeted & Medical Peels",
    pricingNote: "Per Session",
    description: "Deep dermatological resurfacing peel indicated for severe photodamage, deep dynamic rhytids, and advanced structural skin renewal.",
    image: "/chemical peel .webp"
  },
  {
    id: "peel-cosmelan",
    name: "Cosmelan Peel",
    price: "₹6,500",
    priceValue: 6500,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Targeted & Medical Peels",
    pricingNote: "Per Session",
    description: "Gold-standard professional depigmentation treatment formulated to inhibit tyrosinase activity and clear stubborn hormonal melasma.",
    image: "/chemical peel .webp"
  },
  {
    id: "peel-azelan",
    name: "Azelan Peel",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Targeted & Medical Peels",
    pricingNote: "Per Session",
    description: "Potent azelaic and salicylic acid synergy designed for acne-prone skin, controlling excess sebum, active blemishes, and post-inflammatory erythema.",
    image: "/chemical peel .webp"
  },
  {
    id: "peel-yellow",
    name: "Yellow Peel",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Targeted & Medical Peels",
    pricingNote: "Per Session",
    description: "Retinol and phytic acid medical formulation that stimulates cellular renewal, fades sunspots, and restores natural radiance.",
    image: "/chemical peel .webp"
  },
  {
    id: "peel-glycolic",
    name: "Glycolic Peel",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Targeted & Medical Peels",
    pricingNote: "Per Session",
    description: "Alpha-hydroxy acid (AHA) peel that gently breaks down cellular bonds to improve micro-relief, fine lines, and dull skin tone.",
    image: "/chemical peel .webp"
  },
  {
    id: "peel-salicylic",
    name: "Salicylic Peel",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Targeted & Medical Peels",
    pricingNote: "Per Session",
    description: "Lipophilic beta-hydroxy acid (BHA) peel that penetrates deep into sebaceous pores to clear comedones, blackheads, and congestive breakouts.",
    image: "/chemical peel .webp"
  },
  // Brightening & Body Peels
  {
    id: "peel-glow",
    name: "Glow Peel",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Brightening & Body Peels",
    pricingNote: "Per Session",
    description: "Instant skin-brightening peel featuring a tailored cocktail of mild exfoliating acids and antioxidants for an immediate red-carpet luminosity.",
    image: "/chemical peel .webp"
  },
  {
    id: "peel-whitening",
    name: "Whitening Peel",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Brightening & Body Peels",
    pricingNote: "Per Session",
    description: "Targeted botanical and brightening acid peel designed to even out irregular skin tone, sun tan, and post-blemish pigmentation.",
    image: "/chemical peel .webp"
  },
  {
    id: "peel-body",
    name: "Body Peel",
    price: "₹20,000",
    priceValue: 20000,
    categoryId: "chemical-peels",
    categoryName: "Chemical Peels",
    subcategory: "Brightening & Body Peels",
    pricingNote: "Per Session",
    description: "Large-surface dermatological peel targeting extensive areas such as back acne scars, arms, legs, and overall body hyperpigmentation.",
    image: "/chemical peel .webp"
  },

  // ==========================================
  // CATEGORY 3: Injectables, Drips & Anti-Aging / Lifting (6 items)
  // ==========================================
  // Neuromodulators & Dermal Fillers
  {
    id: "face-botox",
    name: "Face Botox (Per Unit)",
    price: "₹450",
    priceValue: 450,
    categoryId: "injectables-antiaging",
    categoryName: "Injectables, Drips & Anti-Aging / Lifting",
    subcategory: "Neuromodulators & Dermal Fillers",
    pricingNote: "Per Unit",
    description: "Premium botulinum toxin type A injected with micro-precision to soften dynamic frown lines, crow's feet, and horizontal forehead creases.",
    image: "/injectables.webp"
  },
  {
    id: "fillers",
    name: "Fillers",
    price: "₹25,000",
    priceValue: 25000,
    categoryId: "injectables-antiaging",
    categoryName: "Injectables, Drips & Anti-Aging / Lifting",
    subcategory: "Neuromodulators & Dermal Fillers",
    pricingNote: "Per Syringe",
    description: "US-FDA approved cross-linked hyaluronic acid dermal fillers to sculpt cheekbones, define jawline contours, and augment lip volume naturally.",
    image: "/injectables.webp"
  },
  {
    id: "skin-boosters",
    name: "Skin Boosters",
    price: "₹10,000",
    priceValue: 10000,
    categoryId: "injectables-antiaging",
    categoryName: "Injectables, Drips & Anti-Aging / Lifting",
    subcategory: "Neuromodulators & Dermal Fillers",
    pricingNote: "Per Session",
    description: "Stabilized micro-injections of non-crosslinked hyaluronic acid and essential micronutrients to deeply hydrate dermal layers from within.",
    image: "/skin booster.webp"
  },
  // Lifting & IV Wellness
  {
    id: "face-thread-lift",
    name: "Face Thread Lift",
    price: "₹30,000",
    priceValue: 30000,
    categoryId: "injectables-antiaging",
    categoryName: "Injectables, Drips & Anti-Aging / Lifting",
    subcategory: "Lifting & IV Wellness",
    pricingNote: "Clinical Treatment",
    description: "Minimally invasive PDO/PLLA thread placement providing an immediate mechanical lift while stimulating long-term neocollagenesis.",
    image: "/injectables.webp"
  },
  {
    id: "hifu",
    name: "HIFU",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "injectables-antiaging",
    categoryName: "Injectables, Drips & Anti-Aging / Lifting",
    subcategory: "Lifting & IV Wellness",
    pricingNote: "Per Session",
    description: "High-Intensity Focused Ultrasound delivering thermal energy to the deep SMAS layer for non-surgical skin tightening and jawline contouring.",
    image: "/injectables.webp"
  },
  {
    id: "glutathione-iv-drip",
    name: "Glutathione IV Drip",
    price: "₹7,000",
    priceValue: 7000,
    categoryId: "injectables-antiaging",
    categoryName: "Injectables, Drips & Anti-Aging / Lifting",
    subcategory: "Lifting & IV Wellness",
    pricingNote: "Per Infusion",
    description: "Medical-grade intravenous infusion of pharmaceutical glutathione enriched with Vitamin C for cellular detoxification and systemic oxidative support.",
    image: "/skin booster.webp"
  },

  // ==========================================
  // CATEGORY 4: Microneedling & MNRF (5 items)
  // ==========================================
  // Microneedling
  {
    id: "microneedling",
    name: "Microneedling",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "microneedling-mnrf",
    categoryName: "Microneedling & MNRF",
    subcategory: "Microneedling",
    pricingNote: "Per Session",
    description: "Automated medical-grade collagen induction therapy creating controlled micro-channels to refine pores, improve texture, and minimize scars.",
    image: "/clinic-interior.webp"
  },
  {
    id: "microneedling-prp",
    name: "Microneedling + PRP",
    price: "₹6,500",
    priceValue: 6500,
    categoryId: "microneedling-mnrf",
    categoryName: "Microneedling & MNRF",
    subcategory: "Microneedling",
    pricingNote: "Per Session",
    description: "Advanced vampire facial combining precision microneedling with autologous platelet-rich plasma to accelerate tissue repair and collagen remodeling.",
    image: "/clinic-interior.webp"
  },
  // MNRF
  {
    id: "mnrf-prp",
    name: "MNRF (PRP)",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "microneedling-mnrf",
    categoryName: "Microneedling & MNRF",
    subcategory: "MNRF (Radiofrequency Microneedling)",
    pricingNote: "Per Session",
    description: "Fractional radiofrequency energy delivered via insulated micro-needles paired with autologous PRP for potent dermal remodeling and acne scar smoothing.",
    image: "/clinic-interior.webp"
  },
  {
    id: "mnrf-exosome",
    name: "MNRF (Exosome)",
    price: "₹25,000",
    priceValue: 25000,
    categoryId: "microneedling-mnrf",
    categoryName: "Microneedling & MNRF",
    subcategory: "MNRF (Radiofrequency Microneedling)",
    pricingNote: "Per Session",
    description: "Next-generation regenerative aesthetic protocol combining radiofrequency microneedling with purified bio-signaling exosome topical delivery.",
    image: "/clinic-interior.webp"
  },
  {
    id: "mnrf-gfc",
    name: "MNRF (GFC)",
    price: "₹25,000",
    priceValue: 25000,
    categoryId: "microneedling-mnrf",
    categoryName: "Microneedling & MNRF",
    subcategory: "MNRF (Radiofrequency Microneedling)",
    pricingNote: "Per Session",
    description: "High-concentration growth factor concentrate infused post-radiofrequency microneedling for maximal tissue rejuvenation and skin firming.",
    image: "/clinic-interior.webp"
  },

  // ==========================================
  // CATEGORY 5: Laser & Lesion / Growth Removal (6 items)
  // ==========================================
  // Laser Procedures
  {
    id: "co2-laser",
    name: "CO₂ Laser",
    price: "₹10,000",
    priceValue: 10000,
    categoryId: "laser-lesion",
    categoryName: "Laser & Lesion / Growth Removal",
    subcategory: "Laser Procedures",
    pricingNote: "Per Session",
    description: "Ablative fractional carbon dioxide laser therapy delivering micro-thermal treatment zones for deep scar revision, severe texture correction, and skin resurfacing.",
    image: "/Laser hair.webp"
  },
  {
    id: "lip-laser",
    name: "Lip Laser",
    price: "₹3,000",
    priceValue: 3000,
    categoryId: "laser-lesion",
    categoryName: "Laser & Lesion / Growth Removal",
    subcategory: "Laser Procedures",
    pricingNote: "Per Session",
    description: "Specialized low-fluence Q-switched laser pulses targeting melanin buildup and smoker's pigmentation to restore natural pink lip tone.",
    image: "/Laser hair.webp"
  },
  // Spot, Lesion & Tattoo Removal
  {
    id: "wart-removal",
    name: "Wart Removal (According to Size)",
    price: "₹1,500",
    priceValue: 1500,
    categoryId: "laser-lesion",
    categoryName: "Laser & Lesion / Growth Removal",
    subcategory: "Spot, Lesion & Tattoo Removal",
    pricingNote: "According to Size",
    description: "Hygienic, precise electro-cautery or radiofrequency excision to eliminate viral warts with minimal risk of recurrence or scarring.",
    image: "/clinic-interior.webp"
  },
  {
    id: "mole-removal",
    name: "Mole Removal",
    price: "₹1,500",
    priceValue: 1500,
    categoryId: "laser-lesion",
    categoryName: "Laser & Lesion / Growth Removal",
    subcategory: "Spot, Lesion & Tattoo Removal",
    pricingNote: "Per Lesion",
    description: "Dermatological radiofrequency ablation or laser excision of benign melanocytic nevi ensuring clean healing and minimal cosmetic mark.",
    image: "/clinic-interior.webp"
  },
  {
    id: "tattoo-removal",
    name: "Tattoo Removal",
    price: "₹1,500",
    priceValue: 1500,
    categoryId: "laser-lesion",
    categoryName: "Laser & Lesion / Growth Removal",
    subcategory: "Spot, Lesion & Tattoo Removal",
    pricingNote: "Starting From",
    description: "Advanced Q-switched Nd:YAG laser shattering exogenous ink pigment into micro-particles for natural lymphatic elimination.",
    image: "/Laser hair.webp"
  },
  {
    id: "scar-removal",
    name: "Scar Removal (Per Inch)",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "laser-lesion",
    categoryName: "Laser & Lesion / Growth Removal",
    subcategory: "Spot, Lesion & Tattoo Removal",
    pricingNote: "Per Inch",
    description: "Combination surgical and fractional laser protocol designed to remodel hypertrophic, surgical, or post-traumatic scar tissue.",
    image: "/Laser hair.webp"
  },

  // ==========================================
  // CATEGORY 6: Pigmentation, Acne & Skin Brightening (7 items)
  // ==========================================
  // Pigmentation & Acne Care
  {
    id: "freckles-removal",
    name: "Freckles Removal Treatment",
    price: "₹10,000",
    priceValue: 10000,
    categoryId: "pigmentation-acne",
    categoryName: "Pigmentation, Acne & Skin Brightening",
    subcategory: "Pigmentation & Acne Care",
    pricingNote: "Clinical Treatment",
    description: "Targeted photo-acoustic pigment laser energy that selectively fragments ephelides without damaging surrounding normal epidermal tissue.",
    image: "/glass Skin.webp"
  },
  {
    id: "acne-removal",
    name: "Acne Removal Treatment",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "pigmentation-acne",
    categoryName: "Pigmentation, Acne & Skin Brightening",
    subcategory: "Pigmentation & Acne Care",
    pricingNote: "Comprehensive Protocol",
    description: "Multi-modal clinical protocol addressing active acne vulgaris through comedone extraction, medical peels, and blue-light anti-microbial therapy.",
    image: "/chemical peel .webp"
  },
  {
    id: "melasma-pigmentation",
    name: "Melasma / Pigmentation Treatment",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "pigmentation-acne",
    categoryName: "Pigmentation, Acne & Skin Brightening",
    subcategory: "Pigmentation & Acne Care",
    pricingNote: "Comprehensive Protocol",
    description: "Doctor-curated dermatological regimen targeting dermal and epidermal melasma patches using advanced depigmenting solutions and laser toning.",
    image: "/glass Skin.webp"
  },
  // Glass Skin & Whitening Treatments
  {
    id: "korean-glass-treatment",
    name: "Korean Glass Treatment",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "pigmentation-acne",
    categoryName: "Pigmentation, Acne & Skin Brightening",
    subcategory: "Glass Skin & Whitening Treatments",
    pricingNote: "Signature Ritual",
    description: "Our signature multi-step Korean aesthetic ritual delivering profound deep hydration, pore tightening, and a crystal-clear, luminous complexion.",
    image: "/glass Skin.webp"
  },
  {
    id: "skin-whitening-treatment",
    name: "Skin Whitening Treatment",
    price: "₹20,000",
    priceValue: 20000,
    categoryId: "pigmentation-acne",
    categoryName: "Pigmentation, Acne & Skin Brightening",
    subcategory: "Glass Skin & Whitening Treatments",
    pricingNote: "Clinical Session",
    description: "Specialized clinical formulation that suppresses melanogenesis, brightens chronic tanning, and restores healthy, even skin radiance.",
    image: "/glass Skin.webp"
  },
  {
    id: "japanese-collagen-treatment",
    name: "Japanese Collagen Treatment",
    price: "₹30,000",
    priceValue: 30000,
    categoryId: "pigmentation-acne",
    categoryName: "Pigmentation, Acne & Skin Brightening",
    subcategory: "Glass Skin & Whitening Treatments",
    pricingNote: "Luxury Treatment",
    description: "Bio-engineered marine collagen infusion combined with peptide serums to reinforce the skin's structural matrix and restore supple bounce.",
    image: "/skin booster.webp"
  },
  {
    id: "full-body-whitening",
    name: "Full Body Whitening",
    price: "₹80,000",
    priceValue: 80000,
    categoryId: "pigmentation-acne",
    categoryName: "Pigmentation, Acne & Skin Brightening",
    subcategory: "Glass Skin & Whitening Treatments",
    pricingNote: "Comprehensive Program",
    description: "Complete full-body brightening and tone-balancing program incorporating systemic infusions, total-body exfoliation, and advanced light therapies.",
    image: "/glass Skin.webp"
  },

  // ==========================================
  // CATEGORY 7: Semi-Permanent Makeup & HydraFacial (6 items)
  // ==========================================
  // Semi-Permanent Makeup (3 Sittings)
  {
    id: "lip-blushing-3-sittings",
    name: "Lip Blushing (3 Sittings)",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "semipermanent-hydra",
    categoryName: "Semi-Permanent Makeup & HydraFacial",
    subcategory: "Semi-Permanent Makeup (3 Sittings)",
    pricingNote: "3 Sittings Included",
    description: "Cosmetic micro-pigmentation that deposits sheer, customized mineral tint into the lips, enhancing natural shape, symmetry, and color.",
    image: "/clinic-interior.webp"
  },
  {
    id: "bb-glow-3-sittings",
    name: "BB Glow (3 Sittings)",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "semipermanent-hydra",
    categoryName: "Semi-Permanent Makeup & HydraFacial",
    subcategory: "Semi-Permanent Makeup (3 Sittings)",
    pricingNote: "3 Sittings Included",
    description: "Micro-encapsulated organic tint and peptide serum infused using nano-needling to impart a semi-permanent foundation-like radiant finish.",
    image: "/glass Skin.webp"
  },
  {
    id: "cheek-blushing-3-sittings",
    name: "Cheek Blushing (3 Sittings)",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "semipermanent-hydra",
    categoryName: "Semi-Permanent Makeup & HydraFacial",
    subcategory: "Semi-Permanent Makeup (3 Sittings)",
    pricingNote: "3 Sittings Included",
    description: "Subtle, natural-looking flush micro-pigmented onto the malar cheek area to accentuate facial high points without daily blush application.",
    image: "/clinic-interior.webp"
  },
  {
    id: "microblading-3-sittings",
    name: "Microblading (3 Sittings)",
    price: "₹15,000",
    priceValue: 15000,
    categoryId: "semipermanent-hydra",
    categoryName: "Semi-Permanent Makeup & HydraFacial",
    subcategory: "Semi-Permanent Makeup (3 Sittings)",
    pricingNote: "3 Sittings Included",
    description: "Artistic manual feather-stroke technique creating realistic hair-like lines to reshape, define, and fill sparse eyebrows naturally.",
    image: "/clinic-interior.webp"
  },
  // HydraFacial
  {
    id: "hydrafacial-basic",
    name: "HydraFacial (Basic)",
    price: "₹3,500",
    priceValue: 3500,
    categoryId: "semipermanent-hydra",
    categoryName: "Semi-Permanent Makeup & HydraFacial",
    subcategory: "HydraFacial",
    pricingNote: "Essential Session",
    description: "Patented vortex-fusion technology combining deep cleansing, gentle chemical exfoliation, painless suction extractions, and antioxidant hydration.",
    image: "/glass Skin.webp"
  },
  {
    id: "hydrafacial-advanced",
    name: "HydraFacial (Advanced)",
    price: "₹5,000",
    priceValue: 5000,
    categoryId: "semipermanent-hydra",
    categoryName: "Semi-Permanent Makeup & HydraFacial",
    subcategory: "HydraFacial",
    pricingNote: "Advanced Clinical Session",
    description: "Elevated HydraFacial experience including lymphatic drainage, customized booster serums (peptides/brighteners), and therapeutic LED phototherapy.",
    image: "/glass Skin.webp"
  }
];

/**
 * Builds the WhatsApp prefilled enquiry URL for a specific treatment.
 */
export const getWhatsAppEnquiryUrl = (treatmentName) => {
  const message = `Hello Derma Aline Aesthetics Skin Clinic, I am interested in ${treatmentName}. I would like to know more about this treatment and schedule a consultation.`;
  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};

/**
 * General consultation WhatsApp link.
 */
export const getGeneralWhatsAppUrl = () => {
  const message = "Hello Derma Aline Aesthetics Skin Clinic, I would like to enquire about clinical treatments and schedule a consultation.";
  return `https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
};
