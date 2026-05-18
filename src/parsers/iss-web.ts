/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import { Day } from "../models/Day";
import { Diet } from "../models/Diet";
import * as parser from "node-html-parser";
import { Meal } from "../models/Meal";
import { HashUtils } from "../crypto/hash";
import { Menu } from "../models/Menu";
import { ISSRestaurant } from "../models/iss/ISSRestaurant";
import { formatLocalISO } from "../utils/date";
import he from "he";

export function parse(
  html: string,
  type: string
): { menu: Day[]; diets: Diet[] } | undefined {
  let document = parser.parse(html);
  let container = document.querySelector(".restaurant_menu_container");
  if (!container) return undefined;

  let items: Day[] = [];
  let diets: Diet[] = [];
  let seenDiets = new Set<string>();

  let dayContainers = container.querySelectorAll(".day_menu_container");
  for (let dayEl of dayContainers) {
    let dateAttr = dayEl.getAttribute("data-date");
    if (!dateAttr) continue;

    let [year, month, day] = dateAttr.split("-").map(Number);
    let date = new Date(year, month - 1, day);
    let dateStr = formatLocalISO(date);

    let menuSections: Menu[] = [];
    let currentMenuName: string | null = null;
    let currentMeals: Meal[] = [];

    for (let child of dayEl.childNodes) {
      if (!(child instanceof parser.HTMLElement)) continue;

      if (child.classList.contains("name_price_container")) {
        if (currentMenuName && currentMeals.length > 0) {
          menuSections.push(new Menu(currentMenuName, currentMeals));
          currentMeals = [];
        }
        let h3 = child.querySelector("h3");
        currentMenuName = h3?.text.trim() || "Lounas";
      } else if (child.classList.contains("menu_item_container")) {
        let nameEl = child.querySelector(".menu_item_name");
        if (nameEl) {
          let name = he.decode(nameEl.text).replace(/\s+/g, " ").trim();
          if (name) {
            currentMeals.push(
              new Meal(HashUtils.sha1Digest(type + "_" + name), name)
            );
          }
        }

        let dietEls = child.querySelectorAll(".diet");
        for (let dietEl of dietEls) {
          let title = dietEl.getAttribute("title");
          let code = dietEl.classNames
            .split(" ")
            .find((c: string) => c.startsWith("diet_"))
            ?.replace("diet_", "");
          if (code && title && !seenDiets.has(code)) {
            seenDiets.add(code);
            diets.push(new Diet(code, title));
          }
        }
      }
    }

    if (currentMenuName && currentMeals.length > 0) {
      menuSections.push(new Menu(currentMenuName, currentMeals));
    }

    if (menuSections.length > 0) {
      items.push(new Day(dateStr, menuSections));
    }
  }

  items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { menu: items, diets: diets };
}

export function parseList(html: string): ISSRestaurant[] {
  let document = parser.parse(html);
  let links = document.querySelectorAll('a[class="ravintola__link"]');
  let list: ISSRestaurant[] = [];
  links.forEach((item) => {
    list.push(new ISSRestaurant(item.getAttribute("href"), item.text.trim()));
  });
  return list;
}
