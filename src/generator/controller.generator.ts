import fs from "fs";
import Handlebars from "handlebars";

export const generateController = (model: string) => {
  const template = fs.readFileSync(
    "src/templates/controller.hbs",
    "utf-8"
  );

  const compile = Handlebars.compile(template);

  return compile({
    model,
    lowerModel: model.toLowerCase(),
  });
};