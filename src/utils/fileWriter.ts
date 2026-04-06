import fs from "fs";
import path from "path";

export const writeFile = (filePath: string, content: string) => {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content);
};