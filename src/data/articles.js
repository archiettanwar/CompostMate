export const articles = [
  {
    id: "1",
    title: "The Science Behind C:N Ratio",
    description: "Understand why carbon to nitrogen balance is the secret to perfect compost.",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400",
    readTime: "4 min read",
    level: "Beginner",
    topic: "Science",
    youtubeId: "_lU7G4sJ524",
    content: `The Carbon to Nitrogen ratio (C:N) is the most important factor in composting. 
    Greens (kitchen scraps, grass) have a C:N of ~15:1. Browns (cardboard, dry leaves) have ~300:1. 
    The ideal blend is 25:1 to 30:1. Too much nitrogen = smelly pile. Too much carbon = slow decomposition.
    Mix 1 part greens to 2-3 parts browns by weight for best results.`
  },
  {
    id: "2", 
    title: "Vermicomposting 101",
    description: "How to use worms to create the richest compost possible at home.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    readTime: "5 min read",
    level: "Beginner",
    topic: "Methods",
    youtubeId: "eO4HdrIXnVU",
    content: `Vermicomposting uses red wiggler worms to break down organic waste. 
    You need a bin, bedding (shredded newspaper), and worms. 
    Feed them fruit/veggie scraps, avoid citrus and onions. 
    Harvest castings every 3-4 months. Worm castings are 5x richer than regular compost.`
  },
  {
    id: "3",
    title: "How to Fix a Smelly Compost Bin",
    description: "Common causes of odor and exactly how to fix them fast.",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400",
    readTime: "3 min read",
    level: "Beginner",
    topic: "Troubleshooting",
    youtubeId: "OIXYaZy3qag",
    content: `Smelly compost usually means too much nitrogen or moisture. 
    Fix: add dry browns (cardboard, leaves), turn the pile to add oxygen, 
    check moisture (should feel like a wrung sponge). 
    Ammonia smell = too much nitrogen. Rotten egg smell = anaerobic conditions, turn immediately.`
  },
  {
    id: "4",
    title: "Thermophilic Composting Explained",
    description: "How heat accelerates decomposition and kills pathogens.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    readTime: "6 min read",
    level: "Intermediate",
    topic: "Science",
    youtubeId: "Nswu1b4F17M",
    content: `Thermophilic phase occurs when pile reaches 40-70°C. 
    This kills weed seeds and pathogens. Requires good C:N ratio, 
    moisture and regular turning every 3 days. 
    Use a compost thermometer to monitor. Pile should steam when turned.`
  },
  {
    id: "5",
    title: "Composting in a Mumbai Apartment",
    description: "Practical guide for balcony composting in small urban spaces.",
    image: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400",
    readTime: "4 min read",
    level: "Beginner",
    topic: "Urban",
    youtubeId: "r5Opx7E99YM",
    content: `Mumbai's humidity actually helps composting. Use a 20L bin on your balcony. 
    Add kitchen scraps daily — rice, dal, vegetable peels all work great. 
    Layer with dry leaves or newspaper. Turn weekly. 
    Ready in 45-60 days. Use as fertilizer for balcony plants.`
  },
  {
    id: "6",
    title: "Bokashi vs Traditional Composting",
    description: "Which method is right for your home — a detailed comparison.",
    image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400",
    readTime: "5 min read",
    level: "Intermediate",
    topic: "Methods",
    youtubeId: "k_A6p-p1B9U",
    content: `Bokashi is fermentation, not composting. It uses EM (effective microorganisms) 
    to ferment ALL food waste including meat and dairy. 
    Takes 2 weeks to ferment, then bury in soil for 2 more weeks. 
    Traditional composting takes longer but produces ready-to-use compost directly.`
  },
  {
    id: "7",
    title: "Reading Your Compost — Visual Guide",
    description: "What different colors, textures and smells tell you about your pile.",
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400",
    readTime: "3 min read",
    level: "Intermediate",
    topic: "Troubleshooting",
    youtubeId: "VwT9511gZtQ",
    content: `White fluffy fungus = good, actinomycetes bacteria at work. 
    Black slimy = too wet, add browns. 
    Brown dry = too dry, add water. 
    Dark rich earthy smell = ready to harvest. 
    Fruity smell = fruit flies coming, bury food scraps deeper.`
  },
  {
    id: "8",
    title: "Zero Waste Kitchen: What Goes In",
    description: "Complete A-Z list of what you can and cannot compost from your kitchen.",
    image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=400",
    readTime: "4 min read",
    level: "Beginner",
    topic: "Basics",
    youtubeId: "I6m0nh25UcA",
    content: `YES: Fruit/veggie scraps, tea bags, coffee grounds, eggshells, 
    cooked rice/dal, newspaper, cardboard. 
    NO: Meat, fish, dairy, oily food, diseased plants, pet waste. 
    MAYBE: Citrus (small amounts ok), onions (small amounts ok).`
  }
];

export const learningBadges = [
  { id: "first_read", name: "First Read", condition: "Read 1 article", threshold: 1, icon: "📖" },
  { id: "knowledge_seeker", name: "Knowledge Seeker", condition: "Read 5 articles", threshold: 5, icon: "🔍" },
  { id: "compost_scholar", name: "Compost Scholar", condition: "Read all articles", threshold: 8, icon: "🎓" },
  { id: "quick_learner", name: "Quick Learner", condition: "Read 3 articles in one day", threshold: 3, icon: "⚡" },
];
