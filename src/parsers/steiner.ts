/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from "node-html-parser";
import { Day } from "../models/Day";
import { Meal } from "../models/Meal";
import { HashUtils } from "../crypto/hash";
import { Menu } from "../models/Menu";
import { Diet } from "../models/Diet";
import { parseDM, formatLocalISO } from "../utils/date";

const dayDateRegex = /^(?:MA|TI|KE|TO|PE)\s+(\d+\.\d+)\./;
const dietRegex = /([A-Z]+)=(\S+)/g;
const type = "steiner";

export function parse(
  html: string,
): { menu: Day[]; diets: Diet[] } | undefined {
  const document = parser.parse(html);
  const items: Day[] = [];
  const diets: Diet[] = [];
  const pElems = document.querySelectorAll("p");

  for (const p of pElems) {
    const text = p.text.trim();
    if (!text) continue;

    const dateMatch = dayDateRegex.exec(text);
    if (dateMatch) {
      const date = formatLocalISO(parseDM(dateMatch[1]));
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

      const meals: Meal[] = [];
      for (const line of lines) {
        if (dayDateRegex.test(line)) continue;
        meals.push(
          new Meal(HashUtils.sha1Digest(type + "_" + line), line),
        );
      }

      if (meals.length > 0) {
        items.push(new Day(date, [new Menu("Lounas", meals)]));
      }
      continue;
    }

    if (dietRegex.test(text) && diets.length === 0) {
      dietRegex.lastIndex = 0;
      let match;
      while ((match = dietRegex.exec(text)) !== null) {
        diets.push(new Diet(match[1], match[2]));
      }
    }
  }

  return items.length > 0 ? { menu: items, diets } : undefined;
}
