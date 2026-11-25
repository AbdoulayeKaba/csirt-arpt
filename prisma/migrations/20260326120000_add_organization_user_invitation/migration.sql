-- AlterTable
ALTER TABLE `users` ADD COLUMN `organization_id` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `organizations` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(200) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `email_domains` TEXT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `organizations_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `token_hash` VARCHAR(128) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `invited_by_id` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `last_sent_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_invitations_token_hash_key`(`token_hash`),
    INDEX `user_invitations_email_status_idx`(`email`, `status`),
    INDEX `user_invitations_organization_id_status_idx`(`organization_id`, `status`),
    INDEX `user_invitations_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `users_organization_id_idx` ON `users`(`organization_id`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_invited_by_id_fkey` FOREIGN KEY (`invited_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
