import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

export const generateApp = (models: string[]): string => {
  const templatePath = path.join(__dirname, "../templates/app.hbs");
  const template = fs.readFileSync(templatePath, "utf-8");
  const compile = Handlebars.compile(template);
  return compile({ models: models.map((m) => m.toLowerCase()) });
};
