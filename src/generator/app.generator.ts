import fs from "fs";
import Handlebars from "handlebars";

export const generateApp = (models: string[]) => {
  const template = fs.readFileSync(
    "src/templates/app.hbs",
    "utf-8"
  );

  const compile = Handlebars.compile(template);

  return compile({
    models: models.map((m) => m.toLowerCase()),
  });
};