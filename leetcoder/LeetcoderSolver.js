import {getElementByXPath, pasteHelper, selectAllHelper, sleep} from "../utils/utils.js";
import {
  IS_QUESTION_PREMIUM,
  IS_SOLUTION_ACCEPTED_DIV_XPATH,
  LANGUAGE_DISPLAY_MAP,
  QUESTIONS_CODE_DIV_XPATH,
  QUESTIONS_LANGUAGE_BTN_XPATH,
  QUESTIONS_LANGUAGE_DIV_XPATH,
  QUESTIONS_SUBMIT_ACCEPTED_XPATH,
  QUESTIONS_SUBMIT_DIV_XPATH,
} from "../utils/constants.js";
import clipboardy from "clipboardy";
import Logger from "../utils/Logger.js";
import FileManager from "../managers/FileManager.js";
import {getBrowserDetails} from "../managers/BrowserManager.js";
import GroqManager from "../managers/GroqManager.js";
import { PROBLEM_PICK_MODE, SINGLE_PROBLEM_NAME } from "../data.js";

class LeetcoderSolver {
  static async #checkIfSolvedEarlier(problemName) {
    const solvedProblemSet = await FileManager.getSolvedProblemSet()
    return solvedProblemSet.has(problemName);
  }

  static async #solveProblemWithName(problemName) {
    this.currentProblem = problemName;
    try {
      Logger.warn(`[NAVIGATING]\t\t\t:${problemName}`);
      const {page} = await getBrowserDetails();
      await page.goto(`https://leetcode.com/problems/${problemName}`, {
        waitUntil: "domcontentloaded",
      });
      try {
        const acceptedDiv = await getElementByXPath(page, QUESTIONS_SUBMIT_ACCEPTED_XPATH, 4);
        const acceptedText = await acceptedDiv[0].evaluate((ele) => ele.textContent);
        if (acceptedText.includes("Solved")) {
          Logger.error(`[ALREADY_SOLVED]\t\t:${problemName}`);
          await FileManager.setSolvedProblemSet(problemName);
          return;
        }
      } catch (_) {
      }

      

      Logger.success(`[SOLVING]\t\t\t:${problemName}`);

      let language = "cpp";
      try {
        const details = await FileManager.getProblemDetails(problemName);
        language = details.language || "cpp";
      } catch (_) {
        // Fallback to cpp if the local file is missing
      }

      const solutionObj = await GroqManager.generateSolution(problemName, language);
      const code = solutionObj.code;

      await FileManager.saveGroqResponse(problemName, language, code);

      Logger.warn(`[LOADED_SOLUTION]\t\t:${problemName} (language: ${language}, ${code.length} chars)`);

      // Copy code to clipboard
      clipboardy.writeSync(code);

      //Change the language to the code language
      Logger.warn(`[SWITCHING_LANGUAGE]\t\t:${language}`);
      const targetLabel = LANGUAGE_DISPLAY_MAP[language];
      if (!targetLabel) {
        throw new Error(`Unsupported language "${language}" for ${problemName}. Add it to LANGUAGE_DISPLAY_MAP in utils/constants.js.`);
      }

      // Find the language dropdown trigger button dynamically based on currently selected language text
      const buttons = await page.$$("button");
      let allLanguagesBtn = null;
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.textContent, btn);
        const trimmedText = text.trim();
        if (Object.values(LANGUAGE_DISPLAY_MAP).includes(trimmedText)) {
          allLanguagesBtn = btn;
          break;
        }
      }

      if (!allLanguagesBtn) {
        throw new Error(`Language selection button not found in the editor toolbar for ${problemName}.`);
      }
      await page.evaluate(el => el.click(), allLanguagesBtn);

      // Dynamically wait for and click the language option inside the open dropdown container
      const langOptionXPath = `//*[contains(@id, 'headlessui-listbox-option') or contains(@id, 'headlessui-menu-item') or @role='option']//*[text()='${targetLabel}'] | //*[contains(@id, 'headlessui-listbox-option') or contains(@id, 'headlessui-menu-item') or @role='option' or @role='menuitem'][text()='${targetLabel}'] | //li[contains(., '${targetLabel}')] | //*[text()='${targetLabel}']`;
      const languageOption = await getElementByXPath(page, langOptionXPath, 5, 0);
      await page.evaluate(el => el.click(), languageOption[0]);

      await sleep(1);

      // Set code editor value
      let codeSet = false;
      try {
        const evalResult = await page.evaluate((newCode) => {
          if (window.monaco && window.monaco.editor) {
            const editors = window.monaco.editor.getEditors();
            if (editors && editors.length > 0) {
              editors[0].setValue(newCode);
              return true;
            }
          }
          return false;
        }, code);
        if (evalResult) {
          codeSet = true;
          Logger.success("[EDITOR_VALUE_SET]\t: Set editor code using Monaco API successfully.");
          
          // Focus editor textarea and press space/backspace to trigger React onChange state
          const code_editor = await getElementByXPath(page, "//textarea[contains(@class, 'inputarea')]", 5, 0);
          await page.evaluate(el => el.focus(), code_editor[0]);
          await code_editor[0].click();
          await page.keyboard.press("Space");
          await page.keyboard.press("Backspace");
        }
      } catch (err) {
        Logger.warn("[EDITOR_VALUE_SET_FAIL]\t: Failed to set Monaco value via API, falling back to keyboard pasting.");
      }

      if (!codeSet) {
        // Focus on the code editor textarea specifically
        const code_editor = await getElementByXPath(page, "//textarea[contains(@class, 'inputarea')]", 5, 0);
        await page.evaluate(el => el.focus(), code_editor[0]);
        await code_editor[0].click();

        // Select all code to remove
        await selectAllHelper(page);
        // Press Backspace
        await page.keyboard.press("Backspace");
        // Paste the code in the editor
        await pasteHelper(page);
      }

      await sleep(1);

      // Verify if the submit button is enabled, if not, wait up to 5 seconds
      Logger.warn(`[SUBMITTING]\t\t\t:${problemName}`);
      const submit_btn = await getElementByXPath(page, QUESTIONS_SUBMIT_DIV_XPATH, 5, 0);
      
      for (let attempt = 0; attempt < 5; attempt++) {
        const isDisabled = await page.evaluate((btn) => {
          return btn.disabled || btn.classList.contains('cursor-not-allowed') || btn.classList.contains('opacity-50');
        }, submit_btn[0]);
        if (!isDisabled) {
          break;
        }
        await sleep(1);
      }

      await page.evaluate(el => el.click(), submit_btn[0]);

      Logger.warn(`[AWAITING_VERDICT]\t\t:${problemName}`);
      const isSolutionAccepted = await getElementByXPath(page, IS_SOLUTION_ACCEPTED_DIV_XPATH, 90, 0);
      const solutionAcceptedText = await isSolutionAccepted[0].evaluate((ele) => ele.textContent);

      if (solutionAcceptedText === 'Accepted') {
        Logger.success(`[ACCEPTED]\t\t\t:${problemName}`);
        await FileManager.setSolvedProblemSet(problemName);
      } else {
        Logger.error(`[VERDICT_REJECTED]\t:${problemName} - Verdict: ${solutionAcceptedText}`);
      }
      await sleep(1);
    } catch (err) {
      if (err.message && err.message.includes("PREMIUM_LOCKED")) {
        Logger.error(`[PREMIUM_QUESTION]\t\t:${problemName}. Marking this as solved.`);
        await FileManager.setSolvedProblemSet(problemName);
        return;
      }

      const isBrowserClosed = err.message && (
        err.message.includes("Target closed") || 
        err.message.includes("Session closed") || 
        err.message.includes("main frame too early")
      );

      if (isBrowserClosed) {
        Logger.warn(`[BROWSER_CLOSED]\t: The automated browser window was closed or disconnected.`);
        this.stop();
        return;
      }

      Logger.error(`[FAILED]\t\t: Failed to solve the ${problemName} problem with error`, err);
      try {
        const { page } = await getBrowserDetails();
        if (page && !page.isClosed()) {
          await page.screenshot({ path: `error_${problemName}.png` });
          Logger.warn(`[ERROR_SCREENSHOT]\t: Saved error screenshot to error_${problemName}.png`);
        }
      } catch (screenshotErr) {
        // Suppress screenshot log if browser is closing
      }
    }
  }

  static isRunning = false;
  static currentProblem = "";
  static status = "idle"; // "idle", "authenticating", "solving"

  static stop() {
    this.isRunning = false;
    this.status = "idle";
    this.currentProblem = "";
  }

  static async #solveProblems(problemNames) {
    for (const problemName of problemNames) {
      if (!this.isRunning) {
        Logger.warn("[SOLVER_STOPPED]\t: Solver loop stopped by user request.");
        break;
      }
      const checkIfSolved = await this.#checkIfSolvedEarlier(problemName);
      if (!checkIfSolved) {
        await this.#solveProblemWithName(problemName);
      } else {
        Logger.success(`[SOLVED_EARLIER]\t\t:${problemName}`);
      }
    }
  }

  static async solve() {
    this.isRunning = true;
    this.status = "solving";
    Logger.error('<<<< Starting Leetcoder Solver >>>>');
    
    try {
      let problemsToSolve = [];
      if (PROBLEM_PICK_MODE === "single") {
        if (!SINGLE_PROBLEM_NAME) {
          throw new Error("PROBLEM_PICK_MODE is set to 'single' but SINGLE_PROBLEM_NAME is not configured in .env.");
        }
        problemsToSolve = [SINGLE_PROBLEM_NAME];
        Logger.success(`[QUEUED]\t\t\t: Single problem '${SINGLE_PROBLEM_NAME}'`);
      } else {
        const allProblemsName = await FileManager.getAllProblemsNames();
        
        if (PROBLEM_PICK_MODE === "sequential") {
          problemsToSolve = allProblemsName.sort((a, b) => a.localeCompare(b));
          Logger.success(`[QUEUED]\t\t\t:${problemsToSolve.length} problems to process (sequential order)`);
        } else {
          // Default to "random"
          problemsToSolve = allProblemsName;
          for (let i = problemsToSolve.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [problemsToSolve[i], problemsToSolve[j]] = [problemsToSolve[j], problemsToSolve[i]];
          }
          Logger.success(`[QUEUED]\t\t\t:${problemsToSolve.length} problems to process (randomized order)`);
        }
      }

      await this.#solveProblems(problemsToSolve);
    } finally {
      this.isRunning = false;
      this.status = "idle";
      this.currentProblem = "";
      Logger.error('<<<< Exiting Leetcoder Solver >>>>');
    }
  }
}

export default LeetcoderSolver;

