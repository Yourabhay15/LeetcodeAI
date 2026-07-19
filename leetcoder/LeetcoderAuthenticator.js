import {getElementBySelector} from "../utils/utils.js";
import Logger from "../utils/Logger.js";
import {LEETCODER_ASCII_ART} from "../utils/constants.js";
import {getBrowserDetails} from "../managers/BrowserManager.js";

class LeetcoderAuthenticator {
  static #loginUserHandler = async () => {
    const {page} = await getBrowserDetails();
    try {
      await page.goto(`https://leetcode.com/accounts/login/`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch (err) {
      Logger.warn("Navigation warning: Page took too long to load accounts/login/ page, proceeding anyway.");
    }

    try {
      await getElementBySelector(page, '#navbar_user_avatar', 3, 0);
      Logger.success('User was already logged in.')
      return;
    } catch (_) {
    }
    Logger.success('Login Leetcode using your credentials!');
    Logger.info('Please log in using your credentials in the browser window.');
    Logger.info('Cloudflare verification tips:\n[1] Enter email and password, then sign in directly.\n[2] If blocked, click Cloudflare challenge and instantly click sign in.');

    await getElementBySelector(page, '#navbar_user_avatar', 600, 0);
    Logger.success('User Logged in successfully');
  };

  static loginUser = async () => {
    Logger.error('<<<< Starting Leetcoder Authenticator >>>>');
    await this.#loginUserHandler();
    Logger.error('<<<< Exiting Leetcoder Authenticator >>>>');
  };
}

export default LeetcoderAuthenticator;
