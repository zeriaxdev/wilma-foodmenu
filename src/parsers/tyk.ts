/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from "node-html-parser";
import { Day } from "../models/Day";
import { Menu } from "../models/Menu";
import { HashUtils } from "../crypto/hash";
import { Diet } from "../models/Diet";
import he from "he";
import { parseDMY, formatLocalISO, addDays } from "../utils/date";

const dateRegex = /\((\d+)\.\S*?(\d+)\.(\d{4})\)/;
const dietRegex = /([A-Z]+) = (.*)/;
const type = "tyk_yk";

export function parse(
  html: string,
): { menu: Day[]; diets: Diet[] } | undefined {
  let document = parser.parse(html);
  let textBox = document.querySelector('div[class="text"]');
  if (textBox !== null) {
    let items: Day[] = [];
    let diets: Diet[] = [];
    let childElements = textBox.querySelectorAll("*");
    let state: {
      activeWeek: boolean;
      currentWeekDate: Date | undefined;
      currentWeekPos: number;
    } = { activeWeek: false, currentWeekDate: undefined, currentWeekPos: 0 };
    childElements.forEach((i) => {
      if (i.tagName.toLowerCase() === "p") {
        let textContent = i.textContent;
        if (textContent) {
          if (!state.activeWeek) {
            let regexResult = dateRegex.exec(textContent);
            if (regexResult != null) {
              state.currentWeekDate = parseDMY(
                `${regexResult[1]}.${regexResult[2]}.${regexResult[3]}`,
              );
              state.activeWeek = true;
              state.currentWeekPos = 0;
            } else if (textContent.match(dietRegex) && diets.length < 1) {
              textContent.split("\n").forEach((dietRow) => {
                let dietRegexResult = dietRegex.exec(dietRow);
                if (dietRegexResult !== null && dietRegexResult.length > 2)
                  diets.push(new Diet(dietRegexResult[1], dietRegexResult[2]));
              });
            }
          } else if (
            state.currentWeekDate !== undefined &&
            i.querySelector("strong") === null
          ) {
            if (state.currentWeekPos !== 0)
              state.currentWeekDate = addDays(state.currentWeekDate, 1);
            state.currentWeekPos++;
            let correctedContent = he.decode(textContent).replace(/\s+/g, " ").trim();
            if (!correctedContent) return;
            items.push(
              new Day(formatLocalISO(state.currentWeekDate), [
                new Menu("Lounas", [
                  {
                    name: correctedContent,
                    id: HashUtils.sha1Digest(type + "_" + correctedContent),
                  },
                ]),
              ]),
            );
          }
        }
      } else if (i.tagName.toLowerCase() === "hr") {
        state.activeWeek = false;
      }
    });
    return { menu: items, diets: diets };
  }
  return undefined;
}
