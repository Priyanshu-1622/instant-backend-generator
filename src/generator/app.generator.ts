import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

export const generateApp = (models: string[]): string => {
  const template = fs.readFileSync(path.join(__dirname, "../templates/app.hbs"), "utf-8");
  return Handlebars.compile(template)({ models: models.map((m) => m.toLowerCase()) });
};
