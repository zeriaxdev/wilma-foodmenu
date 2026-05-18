/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import { Day } from "../models/Day";
import { Menu } from "../models/Menu";
import { HashUtils } from "../crypto/hash";
import { Diet } from "../models/Diet";
import { Meal } from "../models/Meal";
import { dateFromISOWeek, formatLocalISO, getNow } from "../utils/date";

const dateRegex = /\b[A-Z].*?\b/;
const type = "mayk";

function dayNameToISOWeekday(name: string): number {
    switch (name) {
        case 'maanantai': return 1;
        case 'tiistai': return 2;
        case 'keskiviikko': return 3;
        case 'torstai': return 4;
        case 'perjantai': return 5;
        default: return 0;
    }
}

export function parse(html: string): { menu: Day[], diets: Diet[] } | undefined {
    let document = parser.parse(html);

    let currentDayDate: string | undefined = undefined;
    let weekElement = document.querySelector(".ruokalista-viikko");
    let week = weekElement?.textContent || null;

    let contentBox = document.querySelector(".ruoka-template");
    if (contentBox !== null) {
        let items: Day[] = [];
        let children = document.querySelectorAll('.ruoka-template-header');

        children.forEach(child => {
            let days = child.querySelectorAll('.ruoka-header-pvm');
            days.forEach(day => {
                let dayText = day.textContent;
                if (dayText) {
                    let regexResult = dateRegex.exec(dayText);
                    if (regexResult != null && week) {
                        const weekday = dayNameToISOWeekday(regexResult[0].toLowerCase());
                        if (weekday > 0) {
                            const year = getNow().getFullYear();
                            currentDayDate = formatLocalISO(
                                dateFromISOWeek(year, parseInt(week, 10), weekday)
                            );
                        }
                    }
                }
            })

            let meals: Meal[] = [];
            let mealNormal = child.querySelectorAll('.ruoka-header-ruoka');
            mealNormal.forEach(meal => {
                let mealText = meal.textContent;
                if (mealText) {
                    mealText = mealText.trim();
                    meals.push(new Meal(HashUtils.sha1Digest(type + '_' + mealText), mealText));
                }
            });

            let mealVege = child.querySelectorAll('.ruoka-header-kasvisruoka');
            mealVege.forEach(meal => {
                let mealText = meal.textContent;
                if (mealText) {
                    mealText = mealText.trim();
                    meals.push(new Meal(HashUtils.sha1Digest(type + '_' + mealText),
                        mealText.replace(/\s+Kasvisruoka/g, "")));
                }
            });

            if (meals.length > 0 && currentDayDate) {
                items.push(new Day(currentDayDate, [new Menu('Lounas', meals)]));
            }
            currentDayDate = undefined;
        });
        return { menu: items, diets: [] };
    }
    return undefined;
}
