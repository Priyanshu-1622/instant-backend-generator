import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { ParsedField, RouteName } from "../commands/generate";

export const generateController = (model: string, fields: ParsedField[], routes: RouteName[]): string => {
  const template = fs.readFileSync(path.join(__dirname, "../templates/controller.hbs"), "utf-8");

  // Map fields to Zod types — colocated right here with the controller template
  const zodFields = fields.map((f) => {
    const base = f.type.toLowerCase();
    let zodType: string;
    if (base === "string")             zodType = f.isOptional ? "z.string().optional()" : "z.string().min(1)";
    else if (base === "int" || base === "number") zodType = f.isOptional ? "z.number().int().optional()" : "z.number().int()";
    else if (base === "float")         zodType = f.isOptional ? "z.number().optional()" : "z.number()";
    else if (base === "boolean" || base === "bool") zodType = f.isOptional ? "z.boolean().optional()" : "z.boolean()";
    else if (base === "datetime")      zodType = f.isOptional ? "z.string().datetime().optional()" : "z.string().datetime()";
    else                               zodType = f.isOptional ? "z.string().optional()" : "z.string()";
    return { name: f.name, zodType };
  });

  return Handlebars.compile(template)({
    model,
    lowerModel: model.toLowerCase(),
    fields: zodFields,
    hasCreate: routes.includes("create"),
    hasList:   routes.includes("list"),
    hasGet:    routes.includes("get"),
    hasUpdate: routes.includes("update"),
    hasDelete: routes.includes("delete"),
  });
};
