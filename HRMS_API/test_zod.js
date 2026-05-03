import { z } from "zod";

const schema = z.string().email().optional().nullable();
try {
  schema.parse("");
  console.log("Passed empty string");
} catch (e) {
  console.log("Failed empty string", e.errors);
}
try {
  schema.parse(undefined);
  console.log("Passed undefined");
} catch (e) {
  console.log("Failed undefined");
}
