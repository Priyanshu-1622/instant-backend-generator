import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { RouteName } from "../commands/generate";

export const generateRoute = (model: string, routes: RouteName[]): string => {
  const template = fs.readFileSync(path.join(__dirname, "../templates/route.hbs"), "utf-8");
  return Handlebars.compile(template)({
    model,
    lowerModel: model.toLowerCase(),
    hasCreate: routes.includes("create"),
    hasList:   routes.includes("list"),
    hasGet:    routes.includes("get"),
    hasUpdate: routes.includes("update"),
    hasDelete: routes.includes("delete"),
  });
};
