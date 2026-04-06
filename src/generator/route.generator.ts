import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

export const generateRoute = (model: string): string => {
  const templatePath = path.join(__dirname, "../templates/route.hbs");
  const template = fs.readFileSync(templatePath, "utf-8");
  const compile = Handlebars.compile(template);
  return compile({ model, lowerModel: model.toLowerCase() });
};
