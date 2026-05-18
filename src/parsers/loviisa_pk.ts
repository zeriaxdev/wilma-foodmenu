/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from "node-html-parser";
import { Day } from "../models/Day";
import { Meal } from "../models/Meal";
import { HashUtils } from "../crypto/hash";
import { Menu } from "../models/Menu";
import { removeImagesFromPDF } from "../utils/pdf";
import logger from "../utils/logger";
import { dateFromISOWeek, formatLocalISO, getISOWeek, getNow } from "../utils/date";
const pdfParser = require("pdfreader");

const type = "loviisa_pk";

function dayAbbrevToWeekday(abbrev: string): number {
  switch (abbrev.toLowerCase()) {
    case "ma": return 1;
    case "ti": return 2;
    case "ke": return 3;
    case "to": return 4;
    case "pe": return 5;
    case "la": return 6;
    case "su": return 7;
    default: return 0;
  }
}

export function parsePDFLink(html: string): string | undefined {
  let document = parser.parse(html);
  let urlBox = document.querySelector("section[class='widget sidebar-lift']");
  let links = urlBox?.querySelector("a") ?? null;
  return links?.getAttribute("href");
}

export async function parse(
  content: any,
  callback: (content: Day[] | undefined) => void
) {
  let rows: any = {};
  let days: Day[] = [];
  try {
    content = await removeImagesFromPDF(content);
  } catch (e) {
    logger.error({ err: e }, "Failed to remove images from PDF");
  }
  new pdfParser.PdfReader().parseBuffer(
    content,
    (pdfError: Error, pdf: any) => {
      if (pdfError) {
        callback(undefined);
        return;
      }
      if (!pdf || pdf.page) {
        let items = Object.keys(rows).sort(
          (y1, y2) => parseFloat(y1) - parseFloat(y2)
        );
        let weekStarted = false;
        let weeks: number[] = [];
        let meals: {
          day: string;
          meal: string | null;
          valipala: string | null;
        }[] = [];
        let weekBundles: {
          weeks: number[];
          meals: {
            day: string;
            meal: string | null;
            valipala: string | null;
          }[];
        }[] = [];
        items.slice(1, items.length).forEach((key) => {
          let item = rows[key];
          if (item.length > 0) {
            if (item[0].text.includes("viikko")) {
              if (weekStarted) {
                weekBundles.push({ weeks, meals });
                weeks = [];
                meals = [];
              } else weekStarted = true;

              let cleanWeeks = item[0].text
                .replace("viikko", "")
                .trim()
                .split(",");
              cleanWeeks.forEach((weekNum: string) => {
                weeks.push(parseInt(weekNum.trim()));
              });
            } else if (weekStarted) {
              let weekDay = null;
              let meal: string | null = null;
              let valipala: string | null = null;
              item.forEach((rowCol: { x: number; text: string }) => {
                if (rowCol.x < 4 && rowCol.x > 2) {
                  weekDay = rowCol.text;
                } else if (rowCol.x > 3.5 && rowCol.x < 5) {
                  meal = rowCol.text;
                } else if (rowCol.x > 10) {
                  valipala = rowCol.text;
                }
              });
              if (weekDay != null) {
                meals.push({ day: weekDay, meal, valipala });
              }
            }
          }
        });
        weekBundles.forEach((bundle) => {
          bundle.weeks.forEach((week) => {
            bundle.meals.forEach((meal) => {
              const year = getNow().getFullYear();
              const weekday = dayAbbrevToWeekday(meal.day);
              if (weekday === 0) return;
              logger.debug({ currentWeek: getISOWeek(getNow()), targetWeek: week }, "Loviisa: processing week");
              const dateStr = formatLocalISO(dateFromISOWeek(year, week, weekday));
              let mainMeals = [];
              if (meal.meal)
                mainMeals.push(
                  new Meal(
                    HashUtils.sha1Digest(type + "_main_" + meal.meal),
                    meal.meal
                  )
                );
              if (meal.valipala) {
                days.push(
                  new Day(dateStr, [
                    new Menu("Lounas", mainMeals),
                    new Menu("Välipala", [
                      new Meal(
                        HashUtils.sha1Digest(
                          type + "_välipala_" + meal.valipala
                        ),
                        meal.valipala
                      ),
                    ]),
                  ])
                );
              } else {
                days.push(new Day(dateStr, [new Menu("Lounas", mainMeals)]));
              }
            });
          });
        });
        if (!pdf) {
          days.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          callback(days);
        }
      } else if (pdf.text) {
        (rows[pdf.y] = rows[pdf.y] || []).push({ text: pdf.text, x: pdf.x });
      }
    }
  );
}
