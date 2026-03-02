/*
 * Copyright (c) 2021 wilmaplus-foodmenu, developed by @developerfromjokela, for Wilma Plus mobile app
 */

export class Meal {
    id: string
    name: string
    ingredients?: string

    constructor(id: string, name: string, ingredients?: string) {
        this.id = id;
        this.name = name;
        this.ingredients = ingredients;
    }
}