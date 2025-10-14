/**
 * OPENAI FUNCTION CALLING - TOOL DEFINITIONS
 *
 * These are the tools Pat can call to take actions.
 * Each tool has a JSON schema that OpenAI uses to understand when/how to call it.
 */

export const PAT_TOOLS = [
  {
    type: "function",
    function: {
      name: "log_meal",
      description: "Log food items to the user's meal log. Use this when the user wants to record what they ate. You can extract food items from conversation history.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            description: "Array of food items to log",
            items: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the food item (e.g., 'chicken breast', 'rice', 'broccoli')"
                },
                quantity: {
                  type: "number",
                  description: "Amount of the food"
                },
                unit: {
                  type: "string",
                  description: "Unit of measurement (e.g., 'oz', 'g', 'cup', 'serving')"
                },
                macros: {
                  type: "object",
                  properties: {
                    kcal: { type: "number", description: "Calories" },
                    protein_g: { type: "number", description: "Protein in grams" },
                    fat_g: { type: "number", description: "Fat in grams" },
                    carbs_g: { type: "number", description: "Carbs in grams" },
                    fiber_g: { type: "number", description: "Fiber in grams" }
                  },
                  required: ["kcal", "protein_g", "fat_g", "carbs_g"]
                }
              },
              required: ["name", "quantity", "unit", "macros"]
            }
          },
          meal_slot: {
            type: "string",
            description: "When the meal was eaten",
            enum: ["breakfast", "lunch", "dinner", "snack"]
          },
          timestamp: {
            type: "string",
            description: "ISO timestamp of when the meal was eaten. If not specified, defaults to now."
          }
        },
        required: ["items"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_macros",
      description: "Calculate nutritional macros for food items WITHOUT logging them. Use this when user asks 'what are the macros for...' or 'tell me the nutrition of...'",
      parameters: {
        type: "object",
        properties: {
          food_description: {
            type: "string",
            description: "Description of the food to calculate macros for (e.g., '10 oz ribeye steak', '2 cups cooked rice')"
          }
        },
        required: ["food_description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_remaining_macros",
      description: "Get the user's remaining macro targets for today (calories, protein, carbs, fat remaining)",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "undo_last_meal",
      description: "Delete the most recently logged meal. Use when user says 'undo', 'remove last meal', 'delete that', etc.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];
