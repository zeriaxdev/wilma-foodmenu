/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

export interface NutritionInfo {
  portionSize?: number;
  diets?: string[];
  allergens?: string[];
}

export class Meal {
  id: string;
  name: string;
  ingredients?: string;
  nutrition?: NutritionInfo;

  constructor(
    id: string,
    name: string,
    ingredients?: string,
    nutrition?: NutritionInfo,
  ) {
    this.id = id;
    this.name = name;
    this.ingredients = ingredients;
    this.nutrition = nutrition;
  }
}
