
<p align="center">
  <h1 align="center">Leetcoder</h1>
</p>



<h2 align="center">Last verified working on 15 July 2026</h2>

<p align="center">
  <img src="https://img.shields.io/badge/maintenance-active-success?style=for-the-badge" alt="Actively maintained" />
</p>

<p align="center">
  Automate login, solving, and scraping on LeetCode so you can focus on learning — not busywork.
</p>

---

## Support & Contributions

If you hit a rough edge or have ideas for improvements, feel free to open a ticket or raise a Pull Request.

---

## Important notes

1. Works on **LeetCode’s newer dynamic layout** only.
2. **Windows only** for now. PRs that add solid macOS support are very welcome.
3. **Use responsibly** and in line with LeetCode’s terms.
4. **Privacy:** no data is sent anywhere outside your machine by this tool (see your own Chrome/network setup as usual).

> **Verified working:** **15 July 2026** — if you’re reading this months later, check the “Last commit” badge above; regular commits usually mean the layout selectors are still being kept in sync.

Leetcoder is built to make problem-solving and scraping more efficient. With its automated flow, **Leetcoder can solve on the order of ~200 problems in about an hour** (network and UI permitting).

## Features

1. ### Automated problem solving  
   Automates solving LeetCode questions from your saved solutions, in any language LeetCode supports (C++, Java, Python, Go, Rust, and more).

2. ### Seamless login  
   Handles authentication via a persistent Chrome profile.

3. ### Solution scraping  
   Scrapes and organizes accepted solutions into a local archive.

4. ### Resume where you left off  
   Remembers solved problem names so runs can continue after interruption.

## Usage disclaimer

Leetcoder is for **educational use**. Do not use it to misrepresent your progress or break LeetCode’s rules. Always follow [LeetCode’s terms of service](https://leetcode.com/terms/) and community guidelines.

## Getting started

1. Clone the repo.
   ```bash
    git clone <repository_url>
   ```
2. Open the project in your editor.
3. In the terminal: `yarn install`
4. Create a `.env` in the project root:
   ```text
   ; Used only for the local Chrome profile folder name.
   USER_EMAIL=your_email_here
   ; Chrome → chrome://version/ → Executable Path
   GOOGLE_CHROME_EXECUTABLE_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe
   ```
5. Run: `yarn run start`, then pick a mode:
   ```text
   [L] Login to LeetCode   ← run this first
   [1] Start Leetcode Bot.
   [2] Scrape Solved Leetcode Problems.
   ```

### First run: log in

Pick **`L`** on the first run. A Chrome window opens on the LeetCode login page — log in, then **close the window**. Your session is saved to the local Chrome profile, so run `yarn run start` again and pick `1` or `2` to start.

> Log in again with `L` whenever your session expires. The login window and the bot can't run at the same time, so it's a separate step.

### Where data lives

| Kind | Path |
|------|------|
| Scraped solutions | `./UserData/your_email/LeetcoderData/ScrapedSolutions` |
| Solved problem list (resume) | `./UserData/your_email/LeetcoderData/SolvedProblems.json` |
| Chrome profile (stay logged in) | `./UserData/your_email/ProfileData` |

## Compatibility

Leetcoder targets **Windows**. Behavior on macOS is not supported today — contributions to fix that are welcome.

Issues and pull requests are welcome on GitHub.

## License

Open source under the [MIT License](LICENSE). Free to use and modify for fun or learning; no warranty. If you build on it, a star or mention is appreciated but not required.
