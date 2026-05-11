export const promptCategorySections = [
  {
    title: "Popular Community Questions",
    categories: [
      {
        id: "daily",
        label: "daily check-in",
        title: "Start close.",
        icon: "♡",
        theme: "rose",
        isNew: true
      },
      {
        id: "date-night",
        label: "date night",
        title: "Skip past the small talk.",
        icon: "◐",
        theme: "violet"
      },
      {
        id: "distance",
        label: "long distance",
        title: "Feel near from far away.",
        icon: "⌂",
        theme: "teal"
      }
    ]
  },
  {
    title: "Deeper",
    categories: [
      {
        id: "repair",
        label: "repair",
        title: "Say the honest thing.",
        icon: "↔",
        theme: "blue",
        isNew: true
      },
      {
        id: "gratitude",
        label: "gratitude",
        title: "Notice what is working.",
        icon: "✦",
        theme: "orange"
      },
      {
        id: "closeness",
        label: "closeness",
        title: "Keep the spark kind.",
        icon: "●",
        theme: "green"
      }
    ]
  },
  {
    title: "Would You Rather?",
    categories: [
      {
        id: "oddballs",
        label: "oddballs",
        title: "Ask the weird one.",
        icon: "?",
        theme: "cyan",
        isNew: true
      },
      {
        id: "would-you-rather",
        label: "would you rather?",
        title: "Choose between two sparks.",
        icon: "A/B",
        theme: "burgundy"
      },
      {
        id: "memories",
        label: "memory lane",
        title: "Replay the best bits.",
        icon: "★",
        theme: "indigo"
      }
    ]
  }
];

export const questions = [
  {
    id: "dream",
    categoryId: "daily",
    label: "Question 1",
    text: "What’s a shared dream you and your partner are working towards?"
  },
  {
    id: "miss",
    categoryId: "daily",
    label: "Question 2",
    text: "What is one thing you really miss about each other?"
  },
  {
    id: "habit",
    categoryId: "daily",
    label: "Question 3",
    text: "What is a small habit that makes you feel loved?"
  },
  {
    id: "perfect-date",
    categoryId: "date-night",
    label: "Question 1",
    text: "What would your perfect date night look like this week?"
  },
  {
    id: "laugh",
    categoryId: "date-night",
    label: "Question 2",
    text: "What is something your partner does that always makes you laugh?"
  },
  {
    id: "surprise",
    categoryId: "date-night",
    label: "Question 3",
    text: "What small surprise would make you feel spoiled right now?"
  },
  {
    id: "ritual",
    categoryId: "distance",
    label: "Question 1",
    text: "What long-distance ritual should you protect this month?"
  },
  {
    id: "ordinary-moment",
    categoryId: "distance",
    label: "Question 2",
    text: "What ordinary moment do you wish you could share today?"
  },
  {
    id: "next-visit",
    categoryId: "distance",
    label: "Question 3",
    text: "What is the first thing you want to do on your next visit?"
  },
  {
    id: "misunderstood",
    categoryId: "repair",
    label: "Question 1",
    text: "Where have you felt misunderstood lately?"
  },
  {
    id: "reassurance",
    categoryId: "repair",
    label: "Question 2",
    text: "What reassurance would help you feel steady right now?"
  },
  {
    id: "support",
    categoryId: "repair",
    label: "Question 3",
    text: "How can your partner support you better this week?"
  },
  {
    id: "today-thanks",
    categoryId: "gratitude",
    label: "Question 1",
    text: "What is one thing your partner did recently that you appreciate?"
  },
  {
    id: "proud",
    categoryId: "gratitude",
    label: "Question 2",
    text: "What are you proud of your partner for?"
  },
  {
    id: "small-joy",
    categoryId: "gratitude",
    label: "Question 3",
    text: "What small joy in your relationship deserves more attention?"
  },
  {
    id: "feel-close",
    categoryId: "closeness",
    label: "Question 1",
    text: "When do you feel closest to each other?"
  },
  {
    id: "affection",
    categoryId: "closeness",
    label: "Question 2",
    text: "What kind of affection has been landing well lately?"
  },
  {
    id: "vulnerable",
    categoryId: "closeness",
    label: "Question 3",
    text: "What feels tender but worth sharing?"
  },
  {
    id: "alien",
    categoryId: "oddballs",
    label: "Question 1",
    text: "What would your partner be weirdly good at explaining to strangers?"
  },
  {
    id: "swap-lives",
    categoryId: "oddballs",
    label: "Question 2",
    text: "If you swapped lives for one day, what would surprise you most?"
  },
  {
    id: "silly-rule",
    categoryId: "oddballs",
    label: "Question 3",
    text: "What ridiculous relationship rule would you invent for fun?"
  },
  {
    id: "teleport",
    categoryId: "would-you-rather",
    label: "Question 1",
    text: "Would you rather teleport for one hour together or get one full weekend every month?"
  },
  {
    id: "truth",
    categoryId: "would-you-rather",
    label: "Question 2",
    text: "Would you rather know every tiny thought for a day or share one deep secret?"
  },
  {
    id: "adventure",
    categoryId: "would-you-rather",
    label: "Question 3",
    text: "Would you rather plan a wild trip or recreate your favorite quiet date?"
  },
  {
    id: "first-moment",
    categoryId: "memories",
    label: "Question 1",
    text: "What is a first moment between you two that still feels special?"
  },
  {
    id: "favorite-photo",
    categoryId: "memories",
    label: "Question 2",
    text: "Which photo of you two would you keep forever, and why?"
  },
  {
    id: "repeat-day",
    categoryId: "memories",
    label: "Question 3",
    text: "What day together would you repeat exactly as it happened?"
  }
];

export const defaultMessages = {
  dream: [
    {
      text: "I think one shared dream is having our own little apartment together one day.",
      sender: "partner"
    },
    {
      text: "Same. And making it feel cozy, with lots of photos and memories everywhere.",
      sender: "me"
    },
    {
      text: "And maybe a tiny balcony for morning coffee.",
      sender: "partner"
    }
  ],
  miss: [
    {
      text: "I miss going on random walks together.",
      sender: "partner"
    }
  ],
  habit: [
    {
      text: "I love when you send me little updates during the day.",
      sender: "me"
    }
  ],
  "perfect-date": [],
  laugh: [],
  surprise: [],
  ritual: [],
  "ordinary-moment": [],
  "next-visit": [],
  misunderstood: [],
  reassurance: [],
  support: [],
  "today-thanks": [],
  proud: [],
  "small-joy": [],
  "feel-close": [],
  affection: [],
  vulnerable: [],
  alien: [],
  "swap-lives": [],
  "silly-rule": [],
  teleport: [],
  truth: [],
  adventure: [],
  "first-moment": [],
  "favorite-photo": [],
  "repeat-day": []
};

export const memoryMatchEmojis = [
  "❤️", "💕", "💘", "💝", "🌹", "✨", "🦋", "🌙"
];

export const truthPrompts = [
  "What was your very first impression of me?",
  "What's something about me that you find irresistibly attractive?",
  "What's a secret you haven't told me yet?",
  "When did you first realize you had feelings for me?",
  "What's your favorite memory of us together?",
  "What's something I do that makes you melt inside?",
  "If you could relive one day with me, which would it be?",
  "What do you think is the strongest part of our relationship?",
  "What's one thing you wish we did more often?",
  "What's your favorite thing to hear me say?",
  "What were you thinking during our first kiss?",
  "What's a fear you have about our relationship?",
  "What's the most romantic thing you've ever imagined us doing?",
  "What song makes you think of me?",
  "What's something about our relationship that surprises you?",
  "When do you miss me the most?",
  "What small thing do I do that you absolutely love?",
  "What's your favorite way to spend time together?",
  "What would you want our life to look like in 5 years?",
  "What's something you'd love to try together?"
];

export const darePrompts = [
  "Send the most unflattering selfie on your phone right now",
  "Do your best impression of me for 30 seconds",
  "Text your best friend something sweet about me",
  "Let me pick your profile picture for the next 24 hours",
  "Sing a love song and send a voice note",
  "Write a 4-line poem about us right now",
  "Send me the last photo you took of me",
  "Give me three compliments in a row without pausing",
  "Do a dramatic reading of our last text conversation",
  "Record yourself doing a silly dance and send it",
  "Tell me your screen time for today honestly",
  "Send a voice message saying 'I love you' in three different accents",
  "Make up a couple handshake right now and show me",
  "Draw a portrait of me in 60 seconds and send it",
  "Say five things you love about me while keeping a straight face",
  "Change your ringtone to our song for a week",
  "Plan a surprise mini-date for us right now",
  "Post a story about us with a cheesy caption",
  "Send me a pickup line you'd use on me",
  "Recreate our first photo together as a selfie right now"
];

export const loveQuizQuestions = [
  {
    question: "What is your partner's go-to comfort food?",
    options: ["Pizza", "Ice cream", "Pasta", "Chocolate"],
    note: "Compare answers! See if you really know each other."
  },
  {
    question: "What would your partner's dream vacation be?",
    options: ["Beach resort", "Mountain cabin", "City adventure", "Road trip"],
    note: "Discuss which one you'd actually book!"
  },
  {
    question: "What time does your partner usually fall asleep?",
    options: ["Before 10pm", "10pm-11pm", "11pm-midnight", "After midnight"],
    note: "Night owl or early bird? Do you agree?"
  },
  {
    question: "What's your partner's biggest pet peeve?",
    options: ["Being late", "Messy spaces", "Loud chewing", "Being ignored"],
    note: "This one reveals a lot. Discuss!"
  },
  {
    question: "How does your partner prefer to show love?",
    options: ["Words", "Physical touch", "Gifts", "Quality time"],
    note: "Love languages in action!"
  },
  {
    question: "What would your partner binge-watch?",
    options: ["Comedy", "Romance", "Thriller", "Documentary"],
    note: "Plan your next watch party!"
  },
  {
    question: "What's your partner most afraid of?",
    options: ["Spiders", "Heights", "Being alone", "The dark"],
    note: "Be their protector!"
  },
  {
    question: "What makes your partner laugh the hardest?",
    options: ["Puns & wordplay", "Physical comedy", "Dark humor", "Inside jokes"],
    note: "Use this knowledge wisely!"
  },
  {
    question: "What does your partner do to de-stress?",
    options: ["Music", "Exercise", "Sleep", "Talk to someone"],
    note: "How can you help them relax?"
  },
  {
    question: "What's your partner's hidden talent?",
    options: ["Cooking", "Singing", "Drawing", "Making people laugh"],
    note: "Reveal your secret skills!"
  }
];

export const fortuneCookies = [
  "A surprise message is coming your way today. Keep your phone close.",
  "The distance between you only makes your hearts grow fonder.",
  "Today is a good day to say the thing you've been holding back.",
  "Your next call together will be one to remember.",
  "Something small you do today will mean the world to your partner.",
  "A shared laugh is heading your way before sunset.",
  "The universe is conspiring to bring you closer together.",
  "Your next visit together will create a core memory.",
  "Someone is thinking about you right now with a big smile.",
  "Good things come to those who double-text.",
  "Your love story is someone else's fairy tale.",
  "A voice note today will make everything better.",
  "The countdown to your next hug just got shorter.",
  "Your partner is about to surprise you with something sweet.",
  "Today's vibe: falling in love all over again.",
  "A goodnight text tonight will be extra meaningful.",
  "Something you said recently is still making your partner smile.",
  "Your next shared meal (even virtual) will be chef's kiss.",
  "Romance is in the air. Send a song that reminds you of them.",
  "Your love is the kind poets write about. Keep going."
];

export const dateNightSteps = [
  { type: "question", text: "What made you smile today?" },
  { type: "question", text: "What's something new you learned about yourself this week?" },
  { type: "question", text: "If we could teleport anywhere right now, where would you take me?" },
  { type: "challenge", title: "Compliment Showdown", description: "Take turns giving each other compliments. You can't repeat one! Whoever runs out first loses.", timerSeconds: 60 },
  { type: "question", text: "What's a song that reminds you of us?" },
  { type: "question", text: "What's one thing about our relationship that makes you proud?" },
  { type: "question", text: "What's the most spontaneous thing you've ever done for love?" },
  { type: "wouldyourather", optionA: "Read each other's minds for a day", optionB: "Relive your favorite day together" },
  { type: "question", text: "What's something small I do that means the world to you?" },
  { type: "question", text: "If we wrote a book about us, what would the title be?" },
  { type: "challenge", title: "Two Truths & a Lie", description: "Each of you says three things — two true, one false. Can your partner spot the lie?", timerSeconds: 90 },
  { type: "question", text: "What's a fear you've overcome because of our relationship?" },
  { type: "question", text: "What does home feel like to you?" },
  { type: "wouldyourather", optionA: "Have a surprise date planned by your partner every month", optionB: "Plan one epic trip together every year" },
  { type: "question", text: "What's one dream you haven't told anyone about?" },
  { type: "question", text: "What moment between us do you replay in your head?" },
  { type: "challenge", title: "Staring Contest", description: "Look into each other's eyes without laughing. First one to break loses!", timerSeconds: 30 },
  { type: "question", text: "What do you think we'll be doing ten years from now?" },
  { type: "question", text: "What's the bravest thing about your partner?" },
  { type: "question", text: "What's one thing you want to say right now, no filter?" }
];

export const diceActivities = [
  "Cook together",
  "Watch a movie",
  "Play 20 questions",
  "Draw each other",
  "Take a virtual walk",
  "Plan a trip"
];

export const diceMoods = [
  "...but make it silly",
  "...romantically",
  "...in complete silence",
  "...while telling jokes",
  "...as fast as possible",
  "...in slow motion"
];
