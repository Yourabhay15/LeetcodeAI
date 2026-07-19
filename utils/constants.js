// SCRAPERs XPATH
export const SCRAPER_SUBMITTED_CODE_NAME_XPATH = "/html/body/div[2]/div/div[1]/div/div[1]/h4/a";
export const SCRAPER_SUBMITTED_CODE_LANGUAGE_XPATH =
  "/html/body/div[2]/div/div[1]/div/div[2]/div[7]/div/div[1]/div/div[1]/span";
export const SCRAPER_SUBMITTED_CODE_DIV_XPATH =
  "/html/body/div[2]/div/div[1]/div/div[2]/div[7]/div/div[3]/div/div/div[3]/div/div[3]";

// Questions Solver XPath
export const QUESTIONS_CODE_DIV_XPATH =
  "//textarea[contains(@class, 'inputarea') or @class='inputarea']";
export const QUESTIONS_SUBMIT_DIV_XPATH =
  "//*[@data-e2e-locator='console-submit-button']";
export const QUESTIONS_SUBMIT_ACCEPTED_XPATH =
  "//*[contains(@class, 'green') and contains(text(), 'Solved')]";
export const QUESTIONS_LANGUAGE_BTN_XPATH =
  "//button[contains(@id, 'headlessui-listbox-button') or contains(@id, 'headlessui-menu-button') or contains(@class, 'rounded')]";
export const QUESTIONS_LANGUAGE_DIV_XPATH =
  "//*[contains(@id, 'headlessui-listbox-option') or contains(@id, 'headlessui-menu-item') or @role='option']";
export const IS_SOLUTION_ACCEPTED_DIV_XPATH =
  "//*[@data-e2e-locator='submission-result']";
export const IS_QUESTION_PREMIUM =
  "//*[contains(text(), 'Subscribe to unlock')]";

// Maps LeetCode's language slug (stored in each ./problems/*.json) to the label
// shown in the editor's dropdown. Add an entry to support a new language.
export const LANGUAGE_DISPLAY_MAP = {
  cpp: "C++",
  java: "Java",
  python: "Python",
  python3: "Python3",
  c: "C",
  csharp: "C#",
  javascript: "JavaScript",
  typescript: "TypeScript",
  php: "PHP",
  swift: "Swift",
  kotlin: "Kotlin",
  dart: "Dart",
  golang: "Go",
  ruby: "Ruby",
  scala: "Scala",
  rust: "Rust",
  racket: "Racket",
  erlang: "Erlang",
  elixir: "Elixir",
  bash: "Bash",
  mysql: "MySQL",
  mssql: "MS SQL Server",
};

export const LEETCODER_ASCII_ART = `
     _                    _                _           
    | |                  | |              | |          
    | |     ___  ___  ___| |_ ___ ___   __| | ___ _ __ 
    | |    / _ \\/ _ \\/ _ \\ __/ __/ _ \\ / _| |/ _ \\  __|
    | |___|  __/  __/  __/ || (_| (_) | (_| |  __/ |   
    \\_____/\\___|\\___|\\___|\\__\\___\\___/ \\__,_|\\___|_|
    `;

export const LEETCODER_MODE_QUESTION = `
     Select a mode
     [L] Login to LeetCode (do this first / whenever your session expires).
     [1] Start Leetcode Bot.
     [2] Scrape Solved Leetcode Problems.
     [G] Start Web GUI Dashboard.
     [other] Exit.
    `;

export const EXITING_LEETCODER = `Thanks for using Leetcoder.`;