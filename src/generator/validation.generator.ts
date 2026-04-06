import fs from "fs";
import Handlebars from "handlebars";

export const generateValidation = (model: string, fields: any[]) => {
  const template = fs.readFileSync(
    "src/templates/validation.hbs",
    "utf-8"
  );

  const compile = Handlebars.compile(template);

  const mappedFields = fields.map((f: any) => ({
    name: f.name,
    zodType:
      f.type === "string"
        ? f.isOptional
          ? "string().optional()"
          : "string()"
        : f.isOptional
        ? "number().optional()"
        : "number()",
  }))

  return compile({
    lowerModel: model.toLowerCase(),
    fields: mappedFields,
  });
};