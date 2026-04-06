import fs from "fs";
import Handlebars from "handlebars";

export const generateRoute = (model: string) => {
  const template = fs.readFileSync(
    "src/templates/route.hbs",
    "utf-8"
  );

  const compile = Handlebars.compile(template);

  return compile({
    model,
    lowerModel: model.toLowerCase(),
  });
};
