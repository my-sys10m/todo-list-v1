CREATE TABLE IF NOT EXISTS `t_project` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL,
  `name` text NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS `t_todo` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `project_id` integer NOT NULL,
  `user_id` text NOT NULL,
  `title` text NOT NULL,
  `status` integer NOT NULL CHECK (`status` IN (0, 1, 2)),
  `is_deleted` integer DEFAULT true NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  FOREIGN KEY (`project_id`) REFERENCES `t_project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_t_todo_project_id` ON `t_todo` (`project_id`);

CREATE TABLE IF NOT EXISTS `t_sub_todo` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `todo_id` integer NOT NULL,
  `title` text NOT NULL,
  `status` integer NOT NULL CHECK (`status` IN (0, 1, 2)),
  `is_deleted` integer DEFAULT true NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  FOREIGN KEY (`todo_id`) REFERENCES `t_todo`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS `idx_t_sub_todo_todo_id` ON `t_sub_todo` (`todo_id`);
