export type Ingredient = {
  name: string;
  amount: number | null;
  unit: string | null;
};

export type ShoppingItem = {
  name: string;
  amount: number | null;
  unit: string | null;
  checked: boolean;
  manual: boolean;
};

import type { RECIPE_CATEGORIES } from "@/lib/recipes/categories";

export type RecipeSource = "external" | "custom";

export type RecipeCategory = (typeof RECIPE_CATEGORIES)[number];

export type Database = {
  public: {
    Tables: {
      recipes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          image_url: string | null;
          ingredients: Ingredient[];
          instructions: string[];
          source: RecipeSource;
          external_id: string | null;
          is_favorite: boolean;
          category: RecipeCategory;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          image_url?: string | null;
          ingredients: Ingredient[];
          instructions: string[];
          source: RecipeSource;
          external_id?: string | null;
          is_favorite?: boolean;
          category?: RecipeCategory;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["recipes"]["Insert"]>;
        Relationships: [];
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          recipe_id: string;
          servings: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          recipe_id: string;
          servings?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["meal_plans"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "meal_plans_recipe_id_fkey";
            columns: ["recipe_id"];
            isOneToOne: false;
            referencedRelation: "recipes";
            referencedColumns: ["id"];
          },
        ];
      };
      shopping_lists: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          items: ShoppingItem[];
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start_date: string;
          items: ShoppingItem[];
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["shopping_lists"]["Insert"]
        >;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          week_start_date: string;
          role: "user" | "model";
          text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start_date: string;
          role: "user" | "model";
          text: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["chat_messages"]["Insert"]
        >;
        Relationships: [];
      };
      profiles: {
        Row: {
          user_id: string;
          household_size: number;
          allergies: string;
          dislikes: string;
          preferred_cuisines: string;
          spice_level: string;
          notes: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          household_size?: number;
          allergies?: string;
          dislikes?: string;
          preferred_cuisines?: string;
          spice_level?: string;
          notes?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export type Recipe = Database["public"]["Tables"]["recipes"]["Row"];
export type MealPlan = Database["public"]["Tables"]["meal_plans"]["Row"];
export type ShoppingList =
  Database["public"]["Tables"]["shopping_lists"]["Row"];

export type MealPlanWithRecipe = MealPlan & { recipes: Recipe };
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
