import type { PublicQuestion, QuestionOption } from "@crowdplay/protocol";

export interface QuestionDefinition extends PublicQuestion {
  correctAnswerId: string;
}

const BOOLEAN_OPTIONS: QuestionOption[] = [
  { id: "true", label: "True" },
  { id: "false", label: "False" }
];

export const QUESTION_BANK: QuestionDefinition[] = [
  {
    id: "q_planet_red",
    prompt: "Which planet is known as the Red Planet?",
    format: "mcq",
    options: [
      { id: "mars", label: "Mars" },
      { id: "venus", label: "Venus" },
      { id: "jupiter", label: "Jupiter" },
      { id: "saturn", label: "Saturn" }
    ],
    correctAnswerId: "mars"
  },
  {
    id: "q_ocean_largest",
    prompt: "What is the largest ocean on Earth?",
    format: "mcq",
    options: [
      { id: "pacific", label: "Pacific Ocean" },
      { id: "atlantic", label: "Atlantic Ocean" },
      { id: "indian", label: "Indian Ocean" },
      { id: "arctic", label: "Arctic Ocean" }
    ],
    correctAnswerId: "pacific"
  },
  {
    id: "q_lightning_true",
    prompt: "Lightning is hotter than the surface of the sun.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "true"
  },
  {
    id: "q_japan_capital",
    prompt: "What is the capital city of Japan?",
    format: "mcq",
    options: [
      { id: "tokyo", label: "Tokyo" },
      { id: "kyoto", label: "Kyoto" },
      { id: "osaka", label: "Osaka" },
      { id: "nagoya", label: "Nagoya" }
    ],
    correctAnswerId: "tokyo"
  },
  {
    id: "q_mammal_true",
    prompt: "A dolphin is a mammal.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "true"
  },
  {
    id: "q_author_hobbit",
    prompt: "Who wrote The Hobbit?",
    format: "mcq",
    options: [
      { id: "tolkien", label: "J.R.R. Tolkien" },
      { id: "rowling", label: "J.K. Rowling" },
      { id: "lewis", label: "C.S. Lewis" },
      { id: "martin", label: "George R.R. Martin" }
    ],
    correctAnswerId: "tolkien"
  },
  {
    id: "q_bamboo_true",
    prompt: "Bamboo is a type of grass.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "true"
  },
  {
    id: "q_smallest_prime",
    prompt: "What is the smallest prime number?",
    format: "mcq",
    options: [
      { id: "zero", label: "0" },
      { id: "one", label: "1" },
      { id: "two", label: "2" },
      { id: "three", label: "3" }
    ],
    correctAnswerId: "two"
  },
  {
    id: "q_pacific_true",
    prompt: "The Pacific Ocean is larger than the Atlantic Ocean.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "true"
  },
  {
    id: "q_h2o",
    prompt: "What does H2O represent?",
    format: "mcq",
    options: [
      { id: "salt", label: "Salt" },
      { id: "water", label: "Water" },
      { id: "oxygen", label: "Oxygen" },
      { id: "hydrogen", label: "Hydrogen" }
    ],
    correctAnswerId: "water"
  },
  {
    id: "q_spider_true",
    prompt: "Spiders have six legs.",
    format: "boolean",
    options: BOOLEAN_OPTIONS,
    correctAnswerId: "false"
  },
  {
    id: "q_fastest_land",
    prompt: "Which animal is the fastest on land?",
    format: "mcq",
    options: [
      { id: "cheetah", label: "Cheetah" },
      { id: "lion", label: "Lion" },
      { id: "horse", label: "Horse" },
      { id: "gazelle", label: "Gazelle" }
    ],
    correctAnswerId: "cheetah"
  }
];
