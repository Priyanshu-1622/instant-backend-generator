import fs from "fs";
import path from "path";
import Handlebars from "handlebars";
import { ParsedField } from "../commands/generate";

export const generateValidation = (model: string, fields: ParsedField[]): string => {
  const templatePath = path.join(__dirname, "../templates/validation.hbs");
  const template = fs.readFileSync(templatePath, "utf-8");
  const compile = Handlebars.compile(template);

  const mappedFields = fields.map((f) => {
    let zodType: string;
    const base = f.type.toLowerCase();

    if (base === "string") {
      zodType = f.isOptional ? "string().optional()" : "string().min(1)";
    } else if (base === "int" || base === "number") {
      zodType = f.isOptional ? "number().int().optional()" : "number().int()";
    } else if (base === "float") {
      zodType = f.isOptional ? "number().optional()" : "number()";
    } else if (base === "boolean" || base === "bool") {
      zodType = f.isOptional ? "boolean().optional()" : "boolean()";
    } else if (base === "datetime") {
      zodType = f.isOptional ? "string().datetime().optional()" : "string().datetime()";
    } else {
      zodType = f.isOptional ? "string().optional()" : "string()";
    }

    return { name: f.name, zodType };
  });

  return compile({ lowerModel: model.toLowerCase(), fields: mappedFields });
};
