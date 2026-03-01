import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const repository = sqliteTable('repository', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	path: text('path').notNull()
}, (table) => [
	uniqueIndex('repository_path_unique').on(table.path)
]);

export const workspace = sqliteTable('workspace', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	repositoryId: integer('repository_id')
		.notNull()
		.references(() => repository.id, { onDelete: 'cascade' }),
	brand: text('brand').notNull(),
	relativePath: text('relative_path').notNull()
}, (table) => [
	uniqueIndex('workspace_relative_path_unique').on(table.relativePath),
	uniqueIndex('workspace_repo_brand_path_unique').on(
		table.repositoryId,
		table.brand,
		table.relativePath
	)
]);
