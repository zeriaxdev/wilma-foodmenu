/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import { Day } from "../models/Day";
import { Diet } from "../models/Diet";
// @ts-ignore
import icsToJson from "ics-to-json";
const IcalExpander = require("ical-expander");
import { HashUtils } from "../crypto/hash";
import { startOfISOWeek, addDays, formatLocalISO, startOfDay } from "../utils/date";
const type = "kauhajoki";

/**
 * Now, this is an interesting case. Food menu in a calendar ICS, with repetitive events.
 * @param content
 */
export function parse(
  content: string
): { menu: Day[]; diets: Diet[] } | undefined {
  let days: Day[] = [];
  const now = new Date();
  let rangeStart = addDays(startOfISOWeek(now), -7);
  let rangeEnd = addDays(startOfISOWeek(now), 20);
  const icalExpander = new IcalExpander({ ics: content });
  const events = icalExpander.between(rangeStart, rangeEnd);
  const mappedEvents = events.events.map((e: any) => ({
    startDate: e.startDate,
    endDate: e.endDate,
    summary: e.summary,
  }));
  const mappedOccurrences = events.occurrences.map((o: any) => ({
    startDate: o.startDate,
    endDate: o.endDate,
    summary: o.item.summary,
  }));
  let allEvents = []
    .concat(mappedEvents, mappedOccurrences)
    .sort(function (a: any, b: any) {
      return (
        a.startDate.toJSDate() -
        b.startDate.toJSDate() +
        (a.endDate.toJSDate() - b.endDate.toJSDate())
      );
    });
  allEvents.map((event: any) => {
    days.push(
      new Day(
        formatLocalISO(startOfDay(event.startDate.toJSDate())),
        [
          {
            name: "Lounas",
            meals: [
              {
                name: event.summary,
                id: HashUtils.sha1Digest(type + "_" + event.summary),
              },
            ],
          },
        ]
      )
    );
  });
  return { menu: days, diets: [] };
}
