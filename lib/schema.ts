import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  pgEnum,
  doublePrecision,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const proteins = pgTable("proteins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sequence: text("sequence").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const visualizationTypeEnum = pgEnum("visualization_type", [
  "2d",
  "3d",
  "ribbon",
  "space-filling",
  "stick",
  "surface",
])

export const visualizations = pgTable("visualizations", {
  id: serial("id").primaryKey(),
  proteinId: integer("protein_id").references(() => proteins.id, { onDelete: "cascade" }),
  visualizationType: varchar("visualization_type", { length: 50 }).notNull(),
  foldingDirections: text("folding_directions"),
  energyValue: doublePrecision("energy_value"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const comparisons = pgTable("comparisons", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const comparisonProteins = pgTable(
  "comparison_proteins",
  {
    comparisonId: integer("comparison_id").references(() => comparisons.id, { onDelete: "cascade" }),
    proteinId: integer("protein_id").references(() => proteins.id, { onDelete: "cascade" }),
  },
  (table) => {
    return {
      pk: primaryKey(table.comparisonId, table.proteinId),
    }
  },
)

export const savedExports = pgTable("saved_exports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  proteinId: integer("protein_id").references(() => proteins.id, { onDelete: "cascade" }),
  exportType: varchar("export_type", { length: 50 }).notNull(),
  filePath: text("file_path").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const energySimulations = pgTable("energy_simulations", {
  id: serial("id").primaryKey(),
  proteinId: integer("protein_id").references(() => proteins.id, { onDelete: "cascade" }),
  algorithmType: varchar("algorithm_type", { length: 50 }).notNull(),
  initialEnergy: doublePrecision("initial_energy"),
  finalEnergy: doublePrecision("final_energy"),
  iterations: integer("iterations"),
  temperature: doublePrecision("temperature"),
  resultSequence: text("result_sequence"),
  resultDirections: text("result_directions"),
  createdAt: timestamp("created_at").defaultNow(),
})

// Types for TypeScript
export type User = typeof users.$inferSelect
export type Protein = typeof proteins.$inferSelect
export type Visualization = typeof visualizations.$inferSelect
export type Comparison = typeof comparisons.$inferSelect
export type SavedExport = typeof savedExports.$inferSelect
export type EnergySimulation = typeof energySimulations.$inferSelect
