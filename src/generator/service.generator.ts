import fs from "fs";
import Handlebars from "handlebars";

export const generateService = (model: string) => {
  const template = fs.readFileSync(
    "src/templates/service.hbs",
    "utf-8"
  );

  const compile = Handlebars.compile(template);

  return compile({
    model,
    lowerModel: model.toLowerCase(),
  });
};