/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import * as parser from 'node-html-parser'
import moment from 'moment';
import { Day } from "../models/Day";
import { Moment } from "moment/moment";
import { Menu } from "../models/Menu";
import { HashUtils } from "../crypto/hash";
import { Diet } from "../models/Diet";
import { Meal } from "../models/Meal";

const dateRegex = /\b[A-Z].*?\b/;
const type = "mayk";

function convertDayName(name: string) {
    switch (name) {
        case 'maanantai':
            return 'monday';
        case 'tiistai':
            return 'tuesday';
        case 'keskiviikko':
            return 'wednesday';
        case 'torstai':
            return 'thursday';
        case 'perjantai':
            return 'friday';
        default:
            return '';
    }
}

export function parse(html: string): { menu: Day[], diets: Diet[] } | undefined {
    let document = parser.parse(html);

    let currentDayDate: undefined | Moment = undefined;
    let weekElement = document.querySelector(".ruokalista-viikko");
    let week = weekElement?.textContent || null;

    let contentBox = document.querySelector(".ruoka-template");
    if (contentBox !== null) {
        let items: Day[] = [];
        let weekdays: string[] = [];
        let children = document.querySelectorAll('.ruoka-template-header');

        children.forEach(child => {
            let days = child.querySelectorAll('.ruoka-header-pvm');
            days.forEach(day => {
                let dayText = day.textContent;
                if (dayText) {
                    let regexResult = dateRegex.exec(dayText);

                    if (regexResult != null && week) {
                        weekdays.push(regexResult[0]);

                        for (let i = 0; i < weekdays.length; i++) {
                            let newDay = convertDayName(weekdays[i].toLowerCase());

                            currentDayDate = moment().day(newDay).week(parseInt(week, 10)).startOf('day');
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

            if (meals.length > 0) {
                items.push(new Day(currentDayDate?.toISOString(true), [new Menu('Lounas', meals)]));
            }
            currentDayDate = undefined;
        });
        return { menu: items, diets: [] };
    }
    return undefined;
}