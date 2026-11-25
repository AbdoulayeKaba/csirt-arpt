-- CreateTable
CREATE TABLE `organization_deactivation_requests` (
    `id` VARCHAR(191) NOT NULL,
    `organization_id` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `requested_by_id` VARCHAR(191) NULL,
    `requested_by_name` VARCHAR(191) NOT NULL,
    `requested_by_email` VARCHAR(191) NOT NULL,
    `expires_at` DATETIME(3) NOT NULL,
    `decided_by_id` VARCHAR(191) NULL,
    `decided_by_name` VARCHAR(191) NULL,
    `decided_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `organization_deactivation_requests_organization_id_status_idx`(`organization_id`, `status`),
    INDEX `organization_deactivation_requests_status_expires_at_idx`(`status`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `organization_deactivation_requests` ADD CONSTRAINT `organization_deactivation_requests_organization_id_fkey` FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_deactivation_requests` ADD CONSTRAINT `organization_deactivation_requests_requested_by_id_fkey` FOREIGN KEY (`requested_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `organization_deactivation_requests` ADD CONSTRAINT `organization_deactivation_requests_decided_by_id_fkey` FOREIGN KEY (`decided_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
