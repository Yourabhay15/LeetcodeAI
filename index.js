import Logger from "./utils/Logger.js";
import readline from 'readline';
import LeetcoderAuthenticator from "./leetcoder/LeetcoderAuthenticator.js";
import LeetcoderLogin from "./leetcoder/LeetcoderLogin.js";
import {EXITING_LEETCODER, LEETCODER_ASCII_ART, LEETCODER_MODE_QUESTION} from "./utils/constants.js";
import LeetcoderSolver from "./leetcoder/LeetcoderSolver.js";
import {closeBrowser} from "./managers/BrowserManager.js";
import LeetcoderScraper from "./leetcoder/LeetcoderScraper.js";
import LeetcoderDashboard from "./leetcoder/LeetcoderDashboard.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

(async () => {
  let shouldExit = true;
  try {
    // Start dashboard server in the background
    LeetcoderDashboard.start(3000);

    Logger.success(LEETCODER_ASCII_ART);
    Logger.success(LEETCODER_MODE_QUESTION);
    const type = await question('Select mode (L, 1, 2, G or other): ');

    if (type.toLowerCase() === 'l') {
      await LeetcoderLogin.loginUser();
    } else if (type === '1') {
      await LeetcoderAuthenticator.loginUser();
      await LeetcoderSolver.solve();
    } else if (type === '2') {
      await LeetcoderAuthenticator.loginUser();
      await LeetcoderScraper.scrapeAcceptedSolutions();
    } else if (type === '3') {
      await LeetcoderAuthenticator.loginUser();
      await LeetcoderScraper.scrapeAcceptedSolutionsGlobally();
    } else if (type.toLowerCase() === 'g') {
      Logger.success('[GUI_MODE]\t\t: Keeping dashboard backend active in the background. Manage everything from http://localhost:3000.');
      shouldExit = false;
    }
  } catch (err) {
    Logger.error('Something went wrong!', err);
  } finally {
    if (shouldExit) {
      Logger.error(EXITING_LEETCODER);
      rl.close();
      await closeBrowser();
      process.exit();
    }
  }
})();