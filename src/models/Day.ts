/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

import { Menu } from "./Menu";

export class Day {
  date: string;
  menus: Menu[];

  constructor(date: string, menus: Menu[]) {
    this.date = date;
    this.menus = menus;
  }
}
