/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from "node-html-parser";
import { Day } from "../models/Day";
import { Meal } from "../models/Meal";
import { HashUtils } from "../crypto/hash";
import { Diet } from "../models/Diet";
import { dateFromISOWeek, formatLocalISO } from "../utils/date";

const type = "krtpl";

function dayNameToWeekday(name: string): number {
  switch (name) {
    case "maanantai": return 1;
    case "tiistai": return 2;
    case "keskiviikko": return 3;
    case "torstai": return 4;
    case "perjantai": return 5;
    case "lauantai": return 6;
    case "sunnuntai": return 7;
    default: return 0;
  }
}

export function parse(
  html: string
): { menu: Day[]; diets: Diet[] } | undefined {
  let document = parser.parse(html);
  let items: Day[] = [];
  let diets: Diet[] = [];
  let weeks = document.querySelectorAll(".lunch-container");
  weeks.forEach((weekBox) => {
    let weekNum =
      weekBox.querySelector(".lunch-current-week-num")?.text.trim() || undefined;
    let dietsHtml = weekBox.querySelector(".shortcuts");
    if (diets.length < 1 && dietsHtml != null) {
      let splittedDiets = dietsHtml.text.trim().split(", ");
      splittedDiets.forEach((splittedDiet) => {
        let dietParts = splittedDiet.split(" = ");
        diets.push(new Diet(dietParts[0], dietParts[1]));
      });
    }
    if (weekNum != null) {
      let foodBox = weekBox.querySelectorAll(".col-md-12");
      foodBox.forEach((food) => {
        if (weekNum != null) {
          const year = new Date().getFullYear();
          const weekday = dayNameToWeekday(food.classNames[food.classNames.length - 1]);
          if (weekday === 0) return;
          const dateStr = formatLocalISO(
            dateFromISOWeek(year, parseInt(weekNum) + 1, weekday)
          );
          let txtRows = food.querySelectorAll("p");
          let combinedContent = "";
          txtRows.forEach((content) => {
            combinedContent += content.text + "\n";
          });
          items.push(
            new Day(dateStr, [
              {
                name: "Lounas",
                meals: [
                  new Meal(
                    HashUtils.sha1Digest(type + "_" + combinedContent.trim()),
                    combinedContent
                  ),
                ],
              },
            ])
          );
        }
      });
    }
  });
  return { menu: items, diets };
}
