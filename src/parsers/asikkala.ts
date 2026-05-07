/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from "node-html-parser";
import moment from "moment";
import { Day } from "../models/Day";
import { Meal } from "../models/Meal";
import { HashUtils } from "../crypto/hash";
import { Menu } from "../models/Menu";

const dateRegex = /(\d{2})\.(\d{2})\.(\d{4})/;
const weekRegex = /^v(?:ko|KO)\s+\d+$/i;
const type = "asikkala";

export function parse(html: string): Day[] | undefined {
  const document = parser.parse(html);
  const article = document.querySelector("article");
  if (article == null) return undefined;

  const items: Day[] = [];
  const pElems = article.querySelectorAll("p");

  for (const p of pElems) {
    const text = p.text.trim();
    if (!text || weekRegex.test(text)) continue;

    const dateMatch = dateRegex.exec(text);
    if (!dateMatch) continue;

    const date = moment(dateMatch[0], "DD.MM.YYYY").startOf("day").format();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    const meals: Meal[] = [];
    for (const line of lines) {
      if (dateRegex.test(line)) continue;
      if (/^lounas$/i.test(line)) continue;
      if (/^v(?:ko|KO)\s+\d+$/i.test(line)) continue;
      if (/^(?:maanantai|tiistai|keskiviikko|torstai|perjantai|lauantai|sunnuntai)\b/i.test(line)) continue;
      meals.push(
        new Meal(HashUtils.sha1Digest(type + "_" + line), line),
      );
    }

    if (meals.length > 0) {
      items.push(new Day(date, [new Menu("Lounas", meals)]));
    }
  }

  return items.length > 0 ? items : undefined;
}
